import { NextRequest, NextResponse } from "next/server";
import type { FeatureCollection, Geometry } from "geojson";
import { prisma } from "@/lib/db";

type Coordinates = number | Coordinates[];

// 6 decimals ~ 0.1m precision, plenty for map rendering
const truncateCoordinates = (coords: Coordinates): Coordinates =>
  typeof coords === "number"
    ? Math.round(coords * 1e6) / 1e6
    : coords.map(truncateCoordinates);

const truncateGeometry = (geometry: Geometry): Geometry => {
  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries.map(truncateGeometry),
    };
  }
  return {
    ...geometry,
    coordinates: truncateCoordinates(geometry.coordinates) as never,
  };
};

// Slim payload for the home hero map: truncated geometry plus the timestamp
// used for age bucketing (see osm-data-processor.ts). Buckets stay client-side
// because the response is cached and age is relative to now.
const toSlimGeojson = (
  geojson: FeatureCollection
): FeatureCollection<Geometry | null> => ({
  type: "FeatureCollection",
  features: geojson.features.map((feature) => {
    const timestamp =
      feature.properties?.["@timestamp"] ?? feature.properties?.timestamp;
    return {
      type: "Feature" as const,
      geometry: feature.geometry ? truncateGeometry(feature.geometry) : null,
      properties: timestamp != null ? { "@timestamp": timestamp } : {},
    };
  }),
});

// Public endpoint: only featured datasets are exposed. Non-featured datasets
// must 404 regardless of session so this route stays safe without middleware.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: { id, isFeatured: true },
      select: { geojson: true },
    });

    if (!dataset?.geojson) {
      return NextResponse.json(
        { error: "Dataset or GeoJSON not found" },
        { status: 404 }
      );
    }

    const slim = request.nextUrl.searchParams.has("slim");
    const body = slim
      ? toSlimGeojson(dataset.geojson as unknown as FeatureCollection)
      : dataset.geojson;

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching dataset GeoJSON:", error);
    return NextResponse.json(
      { error: "Failed to fetch dataset GeoJSON" },
      { status: 500 }
    );
  }
}
