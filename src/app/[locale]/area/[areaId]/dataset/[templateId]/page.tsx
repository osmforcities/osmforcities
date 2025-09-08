import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DatasetSchema } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/explorer/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/explorer/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/explorer/dataset-actions-section";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import { getAreaDetailsById } from "@/lib/nominatim";
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
  const t = await getTranslations("DatasetPage");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId) || osmRelationId <= 0) {
    notFound();
  }

  if (!isValidTemplateIdentifier(templateId)) {
    return <TemplateNotFoundError templateId={templateId} />;
  }

  return (
    <Suspense fallback={<DatasetLoadingSkeleton />}>
      <AreaTemplateDatasetView
        areaId={osmRelationId}
        templateId={templateId}
        translations={{ t, navT }}
      />
    </Suspense>
  );
}

async function AreaTemplateDatasetView({
  areaId,
  templateId,
  translations,
}: {
  areaId: number;
  templateId: string;
  translations: {
    t: Awaited<ReturnType<typeof getTranslations>>;
    navT: Awaited<ReturnType<typeof getTranslations>>;
  };
}) {
  try {
    const [result, areaInfo] = await Promise.all([
      getOrCreateDataset(areaId, templateId),
      getAreaDetailsById(areaId),
    ]);

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

    const breadcrumbItems = [
      { label: translations.navT("home"), href: "/" },
      { label: areaInfo?.country || "Area" },
      ...(areaInfo?.state ? [{ label: areaInfo.state }] : []),
      { label: areaInfo?.name || dataset.area.name, href: `/area/${areaId}` },
      { label: dataset.template.name },
    ];

    return (
      <div className="bg-gray-50">
        <div
          className="max-w-7xl mx-auto px-4 py-8 flex flex-col"
          style={{ height: "calc(100vh - var(--nav-height))" }}
        >
          <div className="mb-8 flex-shrink-0">
            <BreadcrumbNav items={breadcrumbItems} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            {/* Side Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto space-y-6">
                    <DatasetInfoPanel dataset={dataset} />
                    <DatasetStatsTable dataset={dataset} />
                  </div>
                  <DatasetActionsSection dataset={dataset} />
                </div>
              </div>
            </div>

            {/* Map Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <DatasetMapWrapper dataset={dataset} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
    title: `${templateId} Dataset in Area ${areaId} | OSM for Cities`,
    description: `Explore ${templateId} dataset for area ${areaId} with interactive maps and data analysis tools.`,
  };
}
