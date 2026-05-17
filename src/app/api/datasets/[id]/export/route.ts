import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: { id },
      select: {
        id: true,
        geojson: true,
        cityName: true,
        template: { select: { name: true } },
      },
    });

    if (!dataset?.geojson) {
      return NextResponse.json(
        { error: "Dataset or GeoJSON not found" },
        { status: 404 }
      );
    }

    trackEvent(ANALYTICS_EVENTS.DATASET_DOWNLOAD, `/datasets/${id}/download`);

    const safeName = `${dataset.template.name}-${dataset.cityName}.geojson`.replace(
      /[^\w.\-]+/g,
      "_"
    );

    return new NextResponse(JSON.stringify(dataset.geojson, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting dataset GeoJSON:", error);
    return NextResponse.json(
      { error: "Failed to export dataset" },
      { status: 500 }
    );
  }
}
