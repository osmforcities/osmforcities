import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateMonitorSchema } from "@/schemas/monitor";
import { Prisma } from "@prisma/client";
import {
  fetchOsmRelationData,
  executeOverpassQuery,
  convertOverpassToGeoJSON,
} from "@/lib/osm";
import { calculateBbox } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await findSessionByToken(sessionToken);
  if (!session || session.expiresAt < new Date())
    return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { templateId, osmRelationId, isPublic } = parsed.data;

  const template = await prisma.dataTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template)
    return NextResponse.json({ error: "Template not found" }, { status: 404 });

  let area = await prisma.area.findUnique({
    where: { id: osmRelationId },
  });

  if (!area) {
    try {
      const fetched = await fetchOsmRelationData(osmRelationId);
      if (!fetched)
        return NextResponse.json(
          { error: "Failed to fetch OSM relation" },
          { status: 400 }
        );

      area = await prisma.area.create({
        data: {
          id: osmRelationId,
          name: fetched.name,
          bounds: fetched.bounds,
          countryCode: fetched.countryCode,
          geojson: JSON.parse(JSON.stringify(fetched.convertedGeojson)),
        },
      });
    } catch (err) {
      console.error("Failed to fetch/create OSM relation", err);
      return NextResponse.json(
        { error: "Failed to fetch OSM relation" },
        { status: 500 }
      );
    }
  }

  try {
    const queryString = template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      area.id.toString()
    );

    const overpassData = await executeOverpassQuery(queryString);
    const geojsonData = convertOverpassToGeoJSON(overpassData);
    const bbox = calculateBbox(geojsonData);

    const monitor = await prisma.monitor.create({
      data: {
        userId: session.user.id,
        templateId,
        areaId: area.id,
        cityName: area.name,
        isPublic: isPublic ?? false,
        geojson: JSON.parse(JSON.stringify(geojsonData)),
        bbox: bbox ? JSON.parse(JSON.stringify(bbox)) : null,
        dataCount: overpassData.elements.length,
        lastChecked: new Date(),
      },
      include: { template: true },
    });

    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already have a monitor for this template and city" },
        { status: 409 }
      );
    }

    console.error("Error creating monitor:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
