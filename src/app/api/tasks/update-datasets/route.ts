import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";
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

    // Find datasets that need updating (last checked more than 1 day ago or never checked)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const datasetsToUpdate = await prisma.dataset.findMany({
      where: {
        isActive: true,
        OR: [{ lastChecked: null }, { lastChecked: { lt: oneDayAgo } }],
      },
      include: {
        template: true,
        area: true,
      },
      take: limit,
      orderBy: [
        { lastChecked: "asc" }, // Prioritize datasets never checked
        { updatedAt: "asc" }, // Then oldest updated
      ],
    });

    const results = {
      totalFound: datasetsToUpdate.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const dataset of datasetsToUpdate) {
      try {

        const snapshot = await fetchDatasetSnapshot(
          dataset.areaId,
          dataset.template.overpassQuery
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
          },
        });

        trackEvent(ANALYTICS_EVENTS.DATASET_REFRESH_JOB, `/jobs/datasets/${dataset.id}/refresh`);

        results.successful++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `❌ Failed to update dataset ${dataset.id}:`,
          errorMessage
        );
        results.failed++;
        results.errors.push(`Dataset ${dataset.id}: ${errorMessage}`);
      }
    }

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
