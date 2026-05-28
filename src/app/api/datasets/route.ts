import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CreateDatasetSchema } from "@/schemas/dataset";
import { Prisma } from "@prisma/client";
import { fetchOsmRelationData } from "@/lib/area-boundary";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user || null;

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateDatasetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { templateId, osmRelationId } = parsed.data;

  const template = await prisma.template.findUnique({
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
    const snapshot = await fetchDatasetSnapshot(area.id, template.overpassQuery);

    const dataset = await prisma.dataset.create({
      data: {
        templateId,
        areaId: area.id,
        cityName: area.name,
        geojson: JSON.parse(JSON.stringify(snapshot.geojson)),
        bbox: snapshot.bbox ? JSON.parse(JSON.stringify(snapshot.bbox)) : null,
        dataCount: snapshot.dataCount,
        lastChecked: new Date(),
        stats: JSON.parse(JSON.stringify(snapshot.stats)),
      },
      include: { template: true },
    });

    trackEvent(ANALYTICS_EVENTS.DATASET_CREATE, `/datasets/${dataset.id}/create`, getClientInfo(req));

    return NextResponse.json(dataset, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already have a dataset for this template and city" },
        { status: 409 }
      );
    }

    console.error("Error creating dataset:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
