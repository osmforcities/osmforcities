import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DatasetSchema, type Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/explorer/dataset-actions-section";
import { ExplorerLayout } from "@/components/dataset/explorer/explorer-layout";

async function getDataset(id: string): Promise<Dataset | null> {
  try {
    const session = await auth();
    const user = session?.user || null;

    const rawDataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        template: true,
        area: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        watchers: user
          ? {
              where: { userId: user.id },
              select: { id: true, userId: true, createdAt: true },
            }
          : false,
        _count: {
          select: { watchers: true },
        },
      },
    });

    if (!rawDataset) return null;

    return DatasetSchema.parse({
      ...rawDataset,
      geojson: rawDataset.geojson as FeatureCollection | null,
      bbox: rawDataset.bbox as number[] | null,
      area: {
        ...rawDataset.area,
        geojson: rawDataset.area.geojson as FeatureCollection | null,
      },
      isWatched: user ? rawDataset.watchers.length > 0 : false,
      watchersCount: rawDataset._count.watchers,
      canDelete: user
        ? user.id === rawDataset.user.id && rawDataset._count.watchers <= 1
        : false,
    });
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return null;
  }
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    return notFound();
  }

  return (
    <ExplorerLayout
      infoPanel={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-6">
            <DatasetInfoPanel dataset={dataset} />
            <DatasetStatsTable dataset={dataset} />
          </div>
          <DatasetActionsSection dataset={dataset} />
        </div>
      }
      mapPanel={<DatasetMapWrapper dataset={dataset} />}
    />
  );
}
