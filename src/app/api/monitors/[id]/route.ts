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
    const { id: monitorId } = await params;

    const currentMonitor = await prisma.monitor.findUnique({
      where: {
        id: monitorId,
        userId: session.user.id,
      },
    });

    if (!currentMonitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
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

    const monitor = await prisma.monitor.updateMany({
      where: {
        id: monitorId,
        userId: session.user.id,
      },
      data: updateData,
    });

    if (monitor.count === 0) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    if (isPublic === true && !currentMonitor.isPublic) {
      try {
        const existingWatch = await prisma.monitorWatch.findUnique({
          where: {
            userId_monitorId: {
              userId: session.user.id,
              monitorId: monitorId,
            },
          },
        });

        if (!existingWatch) {
          await prisma.monitorWatch.create({
            data: {
              userId: session.user.id,
              monitorId: monitorId,
            },
          });
        }
      } catch (watchError) {
        console.error("Error auto-watching monitor:", watchError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating monitor:", error);
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

    const { id: monitorId } = await params;

    // Delete the monitor (only if it belongs to the user)
    const monitor = await prisma.monitor.deleteMany({
      where: {
        id: monitorId,
        userId: session.user.id,
      },
    });

    if (monitor.count === 0) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting monitor:", error);
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

    const monitor = await prisma.monitor.findUnique({
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

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    return NextResponse.json(monitor);
  } catch (error) {
    console.error("Error fetching monitor:", error);
    return NextResponse.json(
      { error: "Failed to fetch monitor" },
      { status: 500 }
    );
  }
}
