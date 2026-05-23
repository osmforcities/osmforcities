import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
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

    // Check dataset exists before toggling
    const existing = await prisma.dataset.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    // Toggle isFeatured atomically using a raw update expression
    const [result] = await prisma.$queryRaw<
      { id: string; isFeatured: boolean }[]
    >`
      UPDATE "datasets"
      SET "isFeatured" = NOT "isFeatured"
      WHERE id = ${id}
      RETURNING id, "isFeatured"
    `;

    return NextResponse.json({ id: result.id, isFeatured: result.isFeatured });
  } catch (error) {
    console.error("Error toggling featured status:", error);
    return NextResponse.json(
      { error: "Failed to toggle featured status" },
      { status: 500 }
    );
  }
}
