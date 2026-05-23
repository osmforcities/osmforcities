import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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

    // Get current dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id: params.id }
    });

    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    // Toggle isFeatured
    const updatedDataset = await prisma.dataset.update({
      where: { id: params.id },
      data: { isFeatured: !dataset.isFeatured }
    });

    return NextResponse.json(updatedDataset);
  } catch (error) {
    console.error("Error toggling featured status:", error);
    return NextResponse.json(
      { error: "Failed to toggle featured status" },
      { status: 500 }
    );
  }
}
