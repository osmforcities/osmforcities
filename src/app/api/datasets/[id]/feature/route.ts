import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current session
    const session = await auth();
    const user = session?.user || null;

    // Check admin authorization
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Resolve params
    const { id } = await params;

    // Toggle isFeatured atomically using a raw update expression
    const rows = await prisma.$queryRaw<
      { id: string; isFeatured: boolean }[]
    >`
      UPDATE "datasets"
      SET "isFeatured" = NOT "isFeatured"
      WHERE id = ${id}
      RETURNING id, "isFeatured"
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    const [result] = rows;
    try {
      // Best-effort homepage cache bust; throws without a request store (vitest)
      revalidateTag("featured-datasets");
    } catch {}
    await trackEvent(
      result.isFeatured
        ? ANALYTICS_EVENTS.DATASET_FEATURED
        : ANALYTICS_EVENTS.DATASET_UNFEATURED,
      `/datasets/${result.id}/feature`,
      getClientInfo(request),
    );
    return NextResponse.json({ id: result.id, isFeatured: result.isFeatured });
  } catch (error) {
    console.error("Error toggling featured status:", error);
    return NextResponse.json(
      { error: "Failed to toggle featured status" },
      { status: 500 }
    );
  }
}
