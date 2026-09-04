import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  fetchDatasetSnapshot,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
} from "@/lib/dataset-snapshot";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  CATALOG_FILTER,
  UNCATALOGED_FILTER,
} from "@/lib/dataset-catalog-filter";

// Uncataloged cache rows survive this long after creation so a visitor has time
// to save; deleted rows are recreated on the next visit (#482).
const CLEANUP_GRACE_DAYS = 30;

// Deactivated rows never serve their geojson again — drop the payload. A sweep
// (rather than nulling at deactivation time) also heals rows deactivated
// before this existed.
async function clearGeojsonOfDeactivatedDatasets(): Promise<number> {
  const swept = await prisma.dataset.updateMany({
    where: { isActive: false, geojson: { not: Prisma.AnyNull } },
    data: { geojson: Prisma.JsonNull },
  });
  return swept.count;
}

async function deleteUnattendedDatasets(): Promise<number> {
  const graceCutoff = new Date(
    Date.now() - CLEANUP_GRACE_DAYS * 24 * 60 * 60 * 1000
  );
  const stale = await prisma.dataset.findMany({
    where: { ...UNCATALOGED_FILTER, createdAt: { lt: graceCutoff } },
    select: { id: true, cityName: true },
  });
  if (stale.length === 0) {
    return 0;
  }

  // The filter is re-checked in the delete so a save landing between the two
  // queries wins.
  const { count } = await prisma.dataset.deleteMany({
    where: { id: { in: stale.map((d) => d.id) }, ...UNCATALOGED_FILTER },
  });
  console.log(
    `Cleanup: deleted ${count} uncataloged cache datasets: ` +
      stale.map((d) => `${d.id} (${d.cityName})`).join(", ")
  );
  return count;
}

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
        // Only cataloged datasets (featured or saved) are worth refreshing —
        // uncataloged cache rows serve nobody and were ~91% of Overpass load (#482).
        ...CATALOG_FILTER,
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

    // Advance lastAttempted before any work so the dataset yields its queue slot no matter what
    // happens next — this is what stops one bad dataset from jamming the queue (#431). Returns
    // false (skip this dataset only, never abort the batch) if the claim write itself fails.
    const claimAttempt = async (id: string): Promise<boolean> => {
      try {
        await prisma.dataset.update({
          where: { id },
          data: { lastAttempted: new Date() },
        });
        return true;
      } catch (claimError) {
        console.error(`Failed to claim dataset ${id} (skipping this run):`, claimError);
        return false;
      }
    };

    // Surface persistently-failing datasets for admin review. lastAttempted was already advanced
    // by claimAttempt, so recording a failure here can never re-jam the queue (#431).
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
      // Count a failed claim so results always reconcile (successful + failed === totalFound).
      if (!(await claimAttempt(dataset.id))) {
        results.failed++;
        results.errors.push(`Dataset ${dataset.id}: failed to claim, skipped this run`);
        continue;
      }

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

    const geojsonCleared = await clearGeojsonOfDeactivatedDatasets();
    const deleted = await deleteUnattendedDatasets();

    return NextResponse.json({
      success: true,
      message: "Dataset update task completed",
      data: {
        task: "update-datasets",
        limit,
        ...results,
        cleanup: { deleted, geojsonCleared },
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
