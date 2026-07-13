import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public endpoint: only featured datasets are exposed. Non-featured datasets
// must 404 regardless of session so this route stays safe without middleware.
export async function GET(
  _request: NextRequest,
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

    return new NextResponse(JSON.stringify(dataset.geojson), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Cache-Control": "public, max-age=300",
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
