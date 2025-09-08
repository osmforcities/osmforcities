import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DatasetSchema } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/explorer/dataset-actions-section";
import { ExplorerLayout } from "@/components/dataset/explorer/explorer-layout";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import { isValidTemplateIdentifier } from "@/lib/template-resolver";
import { DatasetLoadingSkeleton } from "@/components/ui/dataset-loading-skeleton";
import {
  TemplateNotFoundError,
  AreaNotFoundError,
  DatasetCreationError,
} from "@/components/ui/dataset-error-states";

type DatasetPageProps = {
  params: Promise<{
    areaId: string;
    templateId: string;
  }>;
};

export default async function DatasetPage({ params }: DatasetPageProps) {
  const { areaId, templateId } = await params;

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId) || osmRelationId <= 0) {
    notFound();
  }

  if (!isValidTemplateIdentifier(templateId)) {
    return <TemplateNotFoundError templateId={templateId} />;
  }

  return (
    <Suspense fallback={<DatasetLoadingSkeleton />}>
      <AreaTemplateDatasetView areaId={osmRelationId} templateId={templateId} />
    </Suspense>
  );
}

async function AreaTemplateDatasetView({
  areaId,
  templateId,
}: {
  areaId: number;
  templateId: string;
}) {
  try {
    const result = await getOrCreateDataset(areaId, templateId);

    const dataset = DatasetSchema.parse({
      ...result.dataset,
      geojson: result.dataset.geojson as FeatureCollection | null,
      bbox: result.dataset.bbox as number[] | null,
      area: {
        ...result.dataset.area,
        geojson: result.dataset.area.geojson as FeatureCollection | null,
      },
      isWatched: false,
      watchersCount: result.dataset.watchers?.length || 0,
      canDelete: false,
    });

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Template not found:")) {
        return <TemplateNotFoundError templateId={templateId} />;
      }

      if (error.message.startsWith("Area not found:")) {
        return <AreaNotFoundError areaId={areaId.toString()} />;
      }

      if (error.message.includes("Template is not active:")) {
        return <TemplateNotFoundError templateId={templateId} />;
      }

      return (
        <DatasetCreationError
          error={error.message}
          areaName={undefined}
          templateName={undefined}
        />
      );
    }

    throw error;
  }
}

export async function generateMetadata({ params }: DatasetPageProps) {
  const { areaId, templateId } = await params;

  return {
    title: `${templateId} in Area ${areaId} | OSM for Cities`,
    description: `Explore ${templateId} dataset for area ${areaId} with interactive maps and data analysis tools.`,
  };
}
