import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { WatchDatasetSchema, UnwatchDatasetSchema } from "@/schemas/dataset";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await findSessionByToken(sessionToken);

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
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
          userId: session.user.id,
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
        userId: session.user.id,
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
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await findSessionByToken(sessionToken);

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const validatedData = UnwatchDatasetSchema.parse({ datasetId });

    const existingWatch = await prisma.datasetWatch.findUnique({
      where: {
        userId_datasetId: {
          userId: session.user.id,
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
          userId: session.user.id,
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
