import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";
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

    const { id: datasetId } = await params;

    const dataset = await prisma.dataset.findFirst({
      where: {
        id: datasetId,
        userId: user.id,
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

    const snapshot = await fetchDatasetSnapshot(
      dataset.areaId,
      dataset.template.overpassQuery
    );

    const updatedDataset = await prisma.dataset.update({
      where: {
        id: datasetId,
      },
      data: {
        dataCount: snapshot.dataCount,
        lastChecked: new Date(),
        stats: JSON.parse(JSON.stringify(snapshot.stats)),
        geojson: JSON.parse(JSON.stringify(snapshot.geojson)),
        bbox: snapshot.bbox ? JSON.parse(JSON.stringify(snapshot.bbox)) : null,
        updatedAt: new Date(),
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

    trackEvent(ANALYTICS_EVENTS.DATASET_REFRESH, `/datasets/${datasetId}/refresh`, getClientInfo(request));

    return NextResponse.json({
      success: true,
      dataset: updatedDataset,
      dataCount: snapshot.dataCount,
    });
  } catch (error) {
    console.error("Error refreshing dataset:", error);
    return NextResponse.json(
      { error: "Failed to refresh dataset data" },
      { status: 500 }
    );
  }
}
