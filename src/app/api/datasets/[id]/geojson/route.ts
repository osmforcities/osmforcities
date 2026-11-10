import { NextRequest, NextResponse } from "next/server";
import type { FeatureCollection } from "geojson";
import { prisma } from "@/lib/db";
import { toSlimGeojson } from "@/lib/slim-geojson";

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
      select: { geojson: true, template: { select: { defaultView: true } } },
    });

    if (!dataset?.geojson) {
      return NextResponse.json(
        { error: "Dataset or GeoJSON not found" },
        { status: 404 }
      );
    }

    const slim = request.nextUrl.searchParams.has("slim");
    const body = slim
      ? toSlimGeojson(
          dataset.geojson as unknown as FeatureCollection,
          dataset.template.defaultView
        )
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
