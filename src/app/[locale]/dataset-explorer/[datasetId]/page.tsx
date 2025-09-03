import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DatasetSchema, type Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetDetailsSection } from "@/components/dataset/explorer/dataset-details-section";
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

export default async function DatasetExplorerPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = await getDataset(datasetId);

  if (!dataset) {
    return notFound();
  }

  return (
    <ExplorerLayout
      infoPanel={
        <>
          <DatasetInfoPanel dataset={dataset} />
          <DatasetStatsTable dataset={dataset} />
          <DatasetDetailsSection dataset={dataset} />
          <DatasetActionsSection dataset={dataset} />
        </>
      }
      mapPanel={<DatasetMapWrapper dataset={dataset} />}
    />
  );
}
