import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  fetchDatasetSnapshot,
  snapshotDatasetColumns,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
} from "@/lib/dataset-snapshot";
import { submitTilesForDataset, tilesOnlyLaneEnabled } from "@/lib/tiler/submit";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manual refresh is an admin-only action. Regular users see the last-fetched
    // timestamp instead of a refresh control.
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: datasetId } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: {
        id: datasetId,
      },
      include: {
        template: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        area: true,
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    if (!dataset.isActive) {
      return NextResponse.json(
        { error: "Cannot refresh inactive dataset" },
        { status: 400 }
      );
    }

    // On the tiles-only lane Sync queues a bake; the reconcile writes its data
    if (tilesOnlyLaneEnabled()) {
      const { tilesState } = await submitTilesForDataset(datasetId);
      if (tilesState !== "pending") {
        return NextResponse.json(
          { error: "Failed to queue the map rebuild" },
          { status: 502 }
        );
      }
      await trackEvent(ANALYTICS_EVENTS.DATASET_REFRESH, `/datasets/${datasetId}/refresh`, getClientInfo(request));
      return NextResponse.json({ success: true, tilesState });
    }

    const snapshot = await fetchDatasetSnapshot(
      dataset.areaId,
      dataset.template.overpassQuery,
      dataset.templateId
    );

    const updatedDataset = await prisma.dataset.update({
      where: {
        id: datasetId,
      },
      data: {
        ...snapshotDatasetColumns(snapshot),
        updatedAt: new Date(),
        lastAttempted: new Date(),
        consecutiveFailures: 0,
        lastError: null,
      },
      include: {
        template: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Empty when the tiler is off, so the stored tilesState stands. A
    // "pending" here tells the client a rebuild was queued, not completed.
    const tilesColumns = await submitTilesForDataset(datasetId);
    const refreshedDataset = { ...updatedDataset, ...tilesColumns };

    await trackEvent(ANALYTICS_EVENTS.DATASET_REFRESH, `/datasets/${datasetId}/refresh`, getClientInfo(request));

    return NextResponse.json({
      success: true,
      dataset: refreshedDataset,
      dataCount: snapshot.dataCount,
      lastChecked: refreshedDataset.lastChecked,
      tilesState: refreshedDataset.tilesState,
    });
  } catch (error) {
    if (error instanceof DatasetTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof DatasetSizeCheckTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Error refreshing dataset:", error);
    return NextResponse.json(
      { error: "Failed to refresh dataset data" },
      { status: 500 }
    );
  }
}
