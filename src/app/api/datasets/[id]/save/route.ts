import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SaveDatasetSchema, UnsaveDatasetSchema } from "@/schemas/dataset";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { MAX_FOLLOWS_PER_USER } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const validatedData = SaveDatasetSchema.parse({ datasetId });

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const existingSave = await prisma.datasetSave.findUnique({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    if (existingSave) {
      return NextResponse.json(
        { error: "Already saved this dataset" },
        { status: 400 },
      );
    }

    const save = await prisma.$transaction(async (tx) => {
      const count = await tx.datasetSave.count({
        where: { userId: user.id },
      });
      if (count >= MAX_FOLLOWS_PER_USER) return null;
      return tx.datasetSave.create({
        data: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      });
    });

    if (!save) {
      return NextResponse.json(
        { error: "follow_limit_reached", limit: MAX_FOLLOWS_PER_USER },
        { status: 403 },
      );
    }

    trackEvent(ANALYTICS_EVENTS.DATASET_FOLLOW, `/datasets/${datasetId}/follow`, getClientInfo(request));

    return NextResponse.json({ success: true, watch: save });
  } catch (error) {
    console.error("Error saving dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: datasetId } = await params;

    const validatedData = UnsaveDatasetSchema.parse({ datasetId });

    const existingSave = await prisma.datasetSave.findUnique({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    if (!existingSave) {
      return NextResponse.json(
        { error: "Not saved this dataset" },
        { status: 400 },
      );
    }

    await prisma.datasetSave.delete({
      where: {
        userId_datasetId: {
          userId: user.id,
          datasetId: validatedData.datasetId,
        },
      },
    });

    trackEvent(ANALYTICS_EVENTS.DATASET_UNFOLLOW, `/datasets/${datasetId}/unfollow`, getClientInfo(request));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unsaving dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
