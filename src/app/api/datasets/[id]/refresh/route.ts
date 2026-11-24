import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { probeElementCount } from "@/lib/overpass/count-probe";
import { recordFailedSubmit, submitTilesForDataset } from "@/lib/tiler/submit";
import { tilerEnabled } from "@/lib/tiler/client";
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
      where: { id: datasetId },
      select: {
        isActive: true,
        areaId: true,
        templateId: true,
        template: { select: { overpassQuery: true } },
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

    if (!tilerEnabled()) {
      return NextResponse.json(
        { error: "Cannot refresh: no tiler is configured" },
        { status: 503 }
      );
    }

    // Claimed before the probe, like the cron, so a tick meanwhile submits no second bake
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { lastAttempted: new Date() },
    });

    const elementCount = await probeElementCount(
      dataset.areaId,
      dataset.template.overpassQuery,
      dataset.templateId
    );

    const { tilesState, tilesError } = await submitTilesForDataset(
      datasetId,
      elementCount
    );
    if (tilesState === "failed") await recordFailedSubmit(datasetId, tilesError);
    // null: an empty dataset, nothing to bake, synced as it stands
    if (tilesState !== "pending" && tilesState !== null) {
      return NextResponse.json(
        { error: "Failed to queue the map rebuild" },
        { status: 502 }
      );
    }
    await trackEvent(ANALYTICS_EVENTS.DATASET_REFRESH, `/datasets/${datasetId}/refresh`, getClientInfo(request));
    return NextResponse.json({ success: true, tilesState });
  } catch (error) {
    console.error("Error refreshing dataset:", error);
    return NextResponse.json(
      { error: "Failed to refresh dataset data" },
      { status: 500 }
    );
  }
}
