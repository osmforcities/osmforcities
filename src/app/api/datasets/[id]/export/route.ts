import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trackEvent, getClientInfo } from "@/lib/umami";
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

    // Await inline (not after()): after() callbacks in this route handler were
    // unreliable and the download event was dropped. Save/unsave await inline and
    // land reliably; match that. The event fetch is bounded to 5s and never throws.
    await trackEvent(
      ANALYTICS_EVENTS.DATASET_DOWNLOAD,
      `/datasets/${id}/download`,
      getClientInfo(_request),
    );

    const safeName = `${dataset.template.name}-${dataset.cityName}.geojson`.replace(
      /[^\w.\-]+/g,
      "_"
    );

    // Compact, not pretty-printed: indentation costs ~1.6x the bytes and the
    // matching stringify/gzip CPU on a single-process box, for a file that goes
    // straight to disk. Measured on the Paris fixtures: 6.5MB -> 4.0MB.
    return new NextResponse(JSON.stringify(dataset.geojson), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
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
