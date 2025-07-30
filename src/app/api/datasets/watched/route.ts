import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DatasetSchema } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchedDatasets = await prisma.datasetWatch.findMany({
      where: {
        userId: user.id,
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
