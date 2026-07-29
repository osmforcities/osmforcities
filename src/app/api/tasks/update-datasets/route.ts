import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchDatasetSnapshot,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
} from "@/lib/dataset-snapshot";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const expectedSecret = process.env.CRON_ROUTE_SECRET;

  if (!expectedSecret) {
    console.error("CRON_ROUTE_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (token !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const limit = parseInt(process.env.DATASET_UPDATE_LIMIT ?? "1");

    // Find datasets that need updating (last attempted more than 1 day ago or never attempted).
    // Scheduling is driven by lastAttempted (advanced on every attempt), not lastChecked
    // (advanced only on success) — otherwise a dataset that keeps failing keeps its old
    // lastChecked, stays most-stale, and is re-selected every run, starving all others (#431).
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const datasetsToUpdate = await prisma.dataset.findMany({
      where: {
        isActive: true,
        OR: [{ lastAttempted: null }, { lastAttempted: { lt: oneDayAgo } }],
      },
      include: {
        template: true,
        area: true,
      },
      take: limit,
      orderBy: [
        { lastAttempted: "asc" }, // Prioritize datasets never attempted
        { updatedAt: "asc" }, // Then oldest updated
      ],
    });

    const results = {
      totalFound: datasetsToUpdate.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Tracking runs inline (not after(), whose callbacks were dropped) but is
    // collected and settled after the loop so a slow Umami call never delays the
    // next dataset. trackEvent is bounded (5s) and never rejects.
    const analyticsEvents: Promise<void>[] = [];

    // Record a failed attempt: bump the consecutive-failure counter and store the message so
    // persistently-failing datasets can be surfaced for admin review (#431). lastAttempted was
    // already advanced upfront, so a failure never re-jams the queue regardless of this write.
    const recordFailure = async (
      id: string,
      message: string,
      extra: Record<string, unknown> = {}
    ) => {
      try {
        await prisma.dataset.update({
          where: { id },
          data: { consecutiveFailures: { increment: 1 }, lastError: message, ...extra },
        });
      } catch (recordError) {
        console.error(`Failed to record failure for dataset ${id}:`, recordError);
      }
    };

    for (const dataset of datasetsToUpdate) {
      // Claim the slot upfront: advancing lastAttempted before any work guarantees this
      // dataset moves to the back of the queue no matter what happens next (even an
      // unexpected throw or a mid-run process kill), so one dataset can never jam the queue.
      await prisma.dataset.update({
        where: { id: dataset.id },
        data: { lastAttempted: new Date() },
      });

      try {

        const snapshot = await fetchDatasetSnapshot(
          dataset.areaId,
          dataset.template.overpassQuery,
          dataset.templateId
        );

        await prisma.dataset.update({
          where: { id: dataset.id },
          data: {
            geojson: JSON.parse(JSON.stringify(snapshot.geojson)),
            bbox: snapshot.bbox ? JSON.parse(JSON.stringify(snapshot.bbox)) : null,
            stats: JSON.parse(JSON.stringify(snapshot.stats)),
            dataCount: snapshot.dataCount,
            lastChecked: new Date(),
            updatedAt: new Date(),
            lastEditedAt: snapshot.stats.mostRecentElement ?? null,
            contributorsCount: snapshot.stats.editorsCount,
            recentlyEditedCount: snapshot.stats.recentActivity.elementsEdited,
            consecutiveFailures: 0,
            lastError: null,
          },
        });

        analyticsEvents.push(
          trackEvent(
            ANALYTICS_EVENTS.DATASET_REFRESH_JOB,
            `/jobs/datasets/${dataset.id}/refresh`
          )
        );

        results.successful++;
      } catch (error) {
        if (error instanceof DatasetTooLargeError) {
          console.warn(
            `Dataset ${dataset.id} deactivated (grew past size cap): ${error.message}`
          );
          await recordFailure(dataset.id, error.message, { isActive: false });
          results.failed++;
          results.errors.push(`Dataset ${dataset.id}: ${error.message}`);
          continue;
        }
        if (error instanceof DatasetSizeCheckTimeoutError) {
          console.warn(
            `Dataset ${dataset.id} skipped (size check timed out), will retry next run`
          );
          await recordFailure(dataset.id, error.message);
          results.failed++;
          results.errors.push(`Dataset ${dataset.id}: ${error.message}`);
          continue;
        }
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `❌ Failed to update dataset ${dataset.id}:`,
          errorMessage
        );
        await recordFailure(dataset.id, errorMessage);
        results.failed++;
        results.errors.push(`Dataset ${dataset.id}: ${errorMessage}`);
      }
    }

    await Promise.allSettled(analyticsEvents);

    return NextResponse.json({
      success: true,
      message: "Dataset update task completed",
      data: {
        task: "update-datasets",
        limit,
        ...results,
      },
    });
  } catch (error) {
    console.error("Error in update-datasets task:", error);
    return NextResponse.json(
      {
        error: "Failed to execute update-datasets task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
