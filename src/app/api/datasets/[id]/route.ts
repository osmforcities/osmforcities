import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: {
        id: id,
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
        area: {
          select: {
            id: true,
            name: true,
            countryCode: true,
            bounds: true,
            geojson: true,
          },
        },
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    return NextResponse.json(dataset);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return NextResponse.json(
      { error: "Failed to fetch dataset" },
      { status: 500 }
    );
  }
}
