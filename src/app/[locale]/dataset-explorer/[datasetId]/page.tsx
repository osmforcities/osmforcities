import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetDetailsSection } from "@/components/dataset/explorer/dataset-details-section";
import { DatasetActionsSection } from "@/components/dataset/explorer/dataset-actions-section";
import { ExplorerLayout } from "@/components/dataset/explorer/explorer-layout";

async function getDataset(id: string) {
  const session = await auth();
  const user = session?.user || null;

  const dataset = await prisma.dataset.findUnique({
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

  return dataset;
}

export default async function DatasetExplorerPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const session = await auth();
  const user = session?.user || null;
  const rawDataset = await getDataset(datasetId);

  if (!rawDataset) {
    return notFound();
  }

  const dataset = {
    ...rawDataset,
    geojson: rawDataset.geojson
      ? typeof rawDataset.geojson === "string"
        ? JSON.parse(rawDataset.geojson)
        : rawDataset.geojson
      : null,
    bbox: rawDataset.bbox
      ? typeof rawDataset.bbox === "string"
        ? JSON.parse(rawDataset.bbox)
        : rawDataset.bbox
      : null,
    stats: rawDataset.stats
      ? typeof rawDataset.stats === "string"
        ? JSON.parse(rawDataset.stats)
        : rawDataset.stats
      : null,
    area: {
      ...rawDataset.area,
      geojson: rawDataset.area.geojson
        ? typeof rawDataset.area.geojson === "string"
          ? JSON.parse(rawDataset.area.geojson)
          : rawDataset.area.geojson
        : null,
    },
    watchersCount: rawDataset._count.watchers,
    isWatched: user ? rawDataset.watchers.length > 0 : false,
  };

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
