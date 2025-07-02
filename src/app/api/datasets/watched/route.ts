import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { DatasetSchema } from "@/schemas/dataset";
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

    const watchedDatasets = await prisma.datasetWatch.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        dataset: {
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

    const datasets = watchedDatasets.map((watch) => {
      const dataset = watch.dataset;
      return DatasetSchema.parse({
        ...dataset,
        geojson: dataset.geojson as FeatureCollection | null,
        bbox: dataset.bbox as number[] | null,
        area: {
          ...dataset.area,
          geojson: dataset.area.geojson as FeatureCollection | null,
        },
        isWatched: true,
        watchersCount: dataset._count.watchers,
      });
    });

    return NextResponse.json(datasets);
  } catch (error) {
    console.error("Error fetching watched datasets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
