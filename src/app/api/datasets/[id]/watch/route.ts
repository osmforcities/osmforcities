import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WatchDatasetSchema, UnwatchDatasetSchema } from "@/schemas/dataset";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const validatedData = WatchDatasetSchema.parse({ datasetId });

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    if (!dataset.isPublic) {
      return NextResponse.json(
        { error: "Cannot watch private dataset" },
        { status: 403 }
      );
    }

    const existingWatch = await prisma.datasetWatch.findUnique({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    if (existingWatch) {
      return NextResponse.json(
        { error: "Already watching this dataset" },
        { status: 400 }
      );
    }

    const watch = await prisma.datasetWatch.create({
      data: {
        userId: user.id,
        datasetId: validatedData.datasetId,
      },
    });

    return NextResponse.json({ success: true, watch });
  } catch (error) {
    console.error("Error watching dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const validatedData = UnwatchDatasetSchema.parse({ datasetId });

    const existingWatch = await prisma.datasetWatch.findUnique({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    if (!existingWatch) {
      return NextResponse.json(
        { error: "Not watching this dataset" },
        { status: 400 }
      );
    }

    await prisma.datasetWatch.delete({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unwatching dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
