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

    const { id: monitorId } = await params;

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: session.user.id,
      },
      include: {
        template: true,
        area: true,
      },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    if (!monitor.isActive) {
      return NextResponse.json(
        { error: "Cannot refresh inactive monitor" },
        { status: 400 }
      );
    }

    const queryString = monitor.template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      monitor.areaId.toString()
    );

    const overpassData = await executeOverpassQuery(queryString);

    const geojsonData = convertOverpassToGeoJSON(overpassData);

    const bbox = calculateBbox(geojsonData);
    const datasetStats = extractDatasetStats(overpassData);

    const updatedMonitor = await prisma.monitor.update({
      where: {
        id: monitorId,
      },
      data: {
        dataCount: overpassData.elements.length,
        lastChecked: new Date(),
        stats: datasetStats,
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
      monitor: updatedMonitor,
      dataCount: overpassData.elements.length,
    });
  } catch (error) {
    console.error("Error refreshing monitor:", error);
    return NextResponse.json(
      { error: "Failed to refresh monitor data" },
      { status: 500 }
    );
  }
}
