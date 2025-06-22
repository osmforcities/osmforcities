import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { MonitorSchema } from "@/schemas/monitor";
import type { FeatureCollection } from "geojson";

const prisma = new PrismaClient();

export async function GET() {
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

    const watchedMonitors = await prisma.monitorWatch.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        monitor: {
          include: {
            template: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            area: true,
            _count: {
              select: { watchers: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const monitors = watchedMonitors.map((watch) => {
      const monitor = watch.monitor;
      return MonitorSchema.parse({
        ...monitor,
        geojson: monitor.geojson as FeatureCollection | null,
        bbox: monitor.bbox as number[] | null,
        area: {
          ...monitor.area,
          geojson: monitor.area.geojson as FeatureCollection | null,
        },
        isWatched: true,
        watchersCount: monitor._count.watchers,
      });
    });

    return NextResponse.json(monitors);
  } catch (error) {
    console.error("Error fetching watched monitors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
