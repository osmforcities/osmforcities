import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  executeOverpassQuery,
  convertOverpassToGeoJSON,
  extractDatasetStats,
} from "@/lib/osm";
import { calculateBbox } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await findSessionByToken(sessionToken);

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const dataset = await prisma.dataset.findFirst({
      where: {
        id: datasetId,
        userId: session.user.id,
      },
      include: {
        template: true,
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

    const queryString = dataset.template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      dataset.areaId.toString()
    );

    const overpassData = await executeOverpassQuery(queryString);

    const geojsonData = convertOverpassToGeoJSON(overpassData);

    const bbox = calculateBbox(geojsonData);
    const datasetStats = extractDatasetStats(overpassData);

    const updatedDataset = await prisma.dataset.update({
      where: {
        id: datasetId,
      },
      data: {
        dataCount: overpassData.elements.length,
        lastChecked: new Date(),
        stats: JSON.parse(JSON.stringify(datasetStats)),
        geojson: JSON.parse(JSON.stringify(geojsonData)),
        bbox: bbox ? JSON.parse(JSON.stringify(bbox)) : null,
        updatedAt: new Date(),
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      dataset: updatedDataset,
      dataCount: overpassData.elements.length,
    });
  } catch (error) {
    console.error("Error refreshing dataset:", error);
    return NextResponse.json(
      { error: "Failed to refresh dataset data" },
      { status: 500 }
    );
  }
}
