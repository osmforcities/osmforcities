import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
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

    const { isActive, isPublic } = await request.json();
    const { id: datasetId } = await params;

    const currentDataset = await prisma.dataset.findUnique({
      where: {
        id: datasetId,
        userId: session.user.id,
      },
    });

    if (!currentDataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      isActive?: boolean;
      isPublic?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }

    const dataset = await prisma.dataset.updateMany({
      where: {
        id: datasetId,
        userId: session.user.id,
      },
      data: updateData,
    });

    if (dataset.count === 0) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    if (isPublic === true && !currentDataset.isPublic) {
      try {
        const existingWatch = await prisma.datasetWatch.findUnique({
          where: {
            userId_datasetId: {
              userId: session.user.id,
              datasetId: datasetId,
            },
          },
        });

        if (!existingWatch) {
          await prisma.datasetWatch.create({
            data: {
              userId: session.user.id,
              datasetId: datasetId,
            },
          });
        }
      } catch (watchError) {
        console.error("Error auto-watching dataset:", watchError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dataset:", error);
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

    const dataset = await prisma.dataset.findUnique({
      where: {
        id: datasetId,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { watchers: true },
        },
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const otherWatchers = await prisma.datasetWatch.findMany({
      where: {
        datasetId: datasetId,
        userId: {
          not: session.user.id,
        },
      },
    });

    if (otherWatchers.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete dataset with watchers",
          details: `This dataset has ${otherWatchers.length} watcher(s) and cannot be deleted. Please make it private first or contact the watchers to unwatch it.`,
        },
        { status: 403 }
      );
    }

    const deletedDataset = await prisma.dataset.deleteMany({
      where: {
        id: datasetId,
        userId: session.user.id,
      },
    });

    if (deletedDataset.count === 0) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dataset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
