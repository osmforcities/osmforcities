import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetDetailsSection } from "@/components/dataset/explorer/dataset-details-section";
import { DatasetActionsSection } from "@/components/dataset/explorer/dataset-actions-section";
import { ExplorerLayout } from "@/components/dataset/explorer/explorer-layout";

async function getDataset(id: string) {
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
  };

  return (
    <ExplorerLayout
      infoPanel={
        <>
          <DatasetInfoPanel dataset={dataset} />
          <DatasetStatsTable dataset={dataset} />
          <DatasetDetailsSection dataset={dataset} />
          <DatasetActionsSection />
        </>
      }
      mapPanel={<DatasetMapWrapper dataset={dataset} />}
    />
  );
}
