import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { WatchMonitorSchema, UnwatchMonitorSchema } from "@/schemas/monitor";

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

    const { id: monitorId } = await params;

    const validatedData = WatchMonitorSchema.parse({ monitorId });

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    if (!monitor.isPublic) {
      return NextResponse.json(
        { error: "Cannot watch private monitor" },
        { status: 403 }
      );
    }

    const existingWatch = await prisma.monitorWatch.findUnique({
      where: {
        userId_monitorId: {
          userId: session.user.id,
          monitorId: validatedData.monitorId,
        },
      },
    });

    if (existingWatch) {
      return NextResponse.json(
        { error: "Already watching this monitor" },
        { status: 400 }
      );
    }

    const watch = await prisma.monitorWatch.create({
      data: {
        userId: session.user.id,
        monitorId: validatedData.monitorId,
      },
    });

    return NextResponse.json({ success: true, watch });
  } catch (error) {
    console.error("Error watching monitor:", error);
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

    const validatedData = UnwatchMonitorSchema.parse({ monitorId });

    const existingWatch = await prisma.monitorWatch.findUnique({
      where: {
        userId_monitorId: {
          userId: session.user.id,
          monitorId: validatedData.monitorId,
        },
      },
    });

    if (!existingWatch) {
      return NextResponse.json(
        { error: "Not watching this monitor" },
        { status: 400 }
      );
    }

    await prisma.monitorWatch.delete({
      where: {
        userId_monitorId: {
          userId: session.user.id,
          monitorId: validatedData.monitorId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unwatching monitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
