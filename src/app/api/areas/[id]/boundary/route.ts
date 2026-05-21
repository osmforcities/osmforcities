import { NextRequest, NextResponse } from "next/server";
import { getAreaBoundary } from "@/lib/area-boundary";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const areaId = Number(id);

    if (isNaN(areaId)) {
      return NextResponse.json({ error: "Invalid area id" }, { status: 400 });
    }

    const boundary = await getAreaBoundary(areaId);

    if (!boundary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(boundary, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("Error fetching area boundary:", error);
    return NextResponse.json({ error: "Failed to fetch boundary" }, { status: 500 });
  }
}
