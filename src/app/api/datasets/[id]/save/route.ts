import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SaveDatasetSchema, UnsaveDatasetSchema } from "@/schemas/dataset";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { MAX_SAVES_PER_USER } from "@/lib/constants";

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

    // The body is optional: a plain save sends none.
    const body = await request.json().catch(() => ({}));
    const validatedData = SaveDatasetSchema.parse({ ...body, datasetId });
    const notifyWhenReady = validatedData.notifyWhenReady ?? false;

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

    // Asking for the email on a dataset already saved: no new save, no quota.
    if (existingSave && notifyWhenReady) {
      const save = await prisma.datasetSave.update({
        where: { id: existingSave.id },
        data: { notifyWhenReady: true },
      });
      return NextResponse.json({ success: true, save });
    }

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
      if (count >= MAX_SAVES_PER_USER) return null;
      return tx.datasetSave.create({
        data: {
          userId: user.id,
          datasetId: validatedData.datasetId,
          notifyWhenReady,
        },
      });
    });

    if (!save) {
      return NextResponse.json(
        { error: "save_limit_reached", limit: MAX_SAVES_PER_USER },
        { status: 403 },
      );
    }

    await trackEvent(ANALYTICS_EVENTS.DATASET_SAVE, `/datasets/${datasetId}/save`, getClientInfo(request));

    return NextResponse.json({ success: true, save });
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

    await trackEvent(ANALYTICS_EVENTS.DATASET_UNSAVE, `/datasets/${datasetId}/unsave`, getClientInfo(request));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unsaving dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
