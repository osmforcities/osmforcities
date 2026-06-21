import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { transformDataset } from "@/lib/dataset/transform";
import { DatasetInteractiveSection } from "@/components/dataset/dataset-interactive-section";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import { getAreaDetailsById } from "@/lib/nominatim";
import {
  isValidTemplateIdentifier,
  resolveTemplate,
} from "@/lib/template-resolver";
import { DatasetLoadingSkeleton } from "@/components/ui/dataset-loading-skeleton";
import {
  TemplateNotFoundError,
  AreaNotFoundError,
  DatasetCreationError,
} from "@/components/ui/dataset-error-states";
import { DatasetUpsellPage } from "@/components/dataset/dataset-upsell-page";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { TranslationFunction } from "@/lib/types";
import { trackEvent, getClientInfoFromHeaders } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getAreaBoundary } from "@/lib/area-boundary";
import { MAX_SAVES_PER_USER } from "@/lib/constants";

export const revalidate = 3600;

type DatasetPageProps = {
  params: Promise<{
    areaId: string;
    templateId: string;
  }>;
};

export default async function DatasetPage({ params }: DatasetPageProps) {
  const { areaId, templateId } = await params;
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId) || osmRelationId <= 0) {
    notFound();
  }

  if (!isValidTemplateIdentifier(templateId)) {
    return <TemplateNotFoundError templateId={templateId} />;
  }

  const session = await auth();
  if (!session?.user) {
    const [template, areaInfo] = await Promise.all([
      resolveTemplate(templateId),
      getAreaDetailsById(osmRelationId),
    ]);

    if (!template) {
      return <TemplateNotFoundError templateId={templateId} />;
    }
    if (!areaInfo) {
      return <AreaNotFoundError areaId={areaId} />;
    }

    trackEvent(
      ANALYTICS_EVENTS.DATASET_UPSELL_VIEW,
      `/area/${areaId}/dataset/${encodeURIComponent(templateId)}/upsell`,
      await getClientInfoFromHeaders()
    );

    return (
      <DatasetUpsellPage
        datasetName={template.name}
        areaName={areaInfo.name}
        areaId={areaId}
      />
    );
  }

  return (
    <Suspense fallback={<DatasetLoadingSkeleton />}>
      <AreaTemplateDatasetView
        areaId={osmRelationId}
        templateId={templateId}
        navT={navT}
        session={session}
      />
    </Suspense>
  );
}

async function AreaTemplateDatasetView({
  areaId,
  templateId,
  navT,
  session,
}: {
  areaId: number;
  templateId: string;
  navT: TranslationFunction;
  session: Awaited<ReturnType<typeof auth>> | null;
}) {
  const locale = await getLocale();

  try {
    const [result, areaInfo] = await Promise.all([
      getOrCreateDataset(areaId, templateId, locale),
      getAreaDetailsById(areaId),
    ]);

    // Check if current user has saved this dataset, and total save count for quota UI
    let isSaved = false;
    let savedCount = 0;
    if (session?.user?.id) {
      const [saveRecord, count] = await Promise.all([
        prisma.datasetSave.findUnique({
          where: {
            userId_datasetId: {
              userId: session.user.id,
              datasetId: result.dataset.id,
            },
          },
        }),
        prisma.datasetSave.count({ where: { userId: session.user.id } }),
      ]);
      isSaved = !!saveRecord;
      savedCount = count;
    }

    const dataset = transformDataset(result.dataset, session?.user || null, locale, { isSaved, skipTemplateResolution: true });

    trackEvent(
      ANALYTICS_EVENTS.DATASET_DETAIL_VIEW,
      `/area/${areaId}/dataset/${encodeURIComponent(templateId)}/view`,
      await getClientInfoFromHeaders()
    );

    const areaName = areaInfo?.name || dataset.area.name;
    const breadcrumbItems = [
      { label: navT("home"), href: "/" },
      { label: areaInfo?.country || "Area" },
      ...(areaInfo?.state ? [{ label: areaInfo.state }] : []),
      { label: areaName, href: `/area/${areaId}` },
      { label: dataset.template.name },
    ];

    // Empty state: dataset has no features in this area.
    if (result.dataset.dataCount === 0) {
      const datasetT = await getTranslations("DatasetPage");
      return (
        <div className="bg-gray-50">
          <div
            className="max-w-7xl mx-auto px-4 py-8 flex flex-col"
            style={{ minHeight: "calc(100vh - var(--nav-height))" }}
          >
            <div className="mb-8 flex-shrink-0">
              <BreadcrumbNav items={breadcrumbItems} />
            </div>

            <EmptyState
              type="no-data"
              title={datasetT("emptyTitle", {
                dataset: dataset.template.name,
                area: areaName,
              })}
              description={datasetT("emptyDescription")}
            />

            <div className="text-center">
              <Link
                href={`/area/${areaId}`}
                className="text-sm text-link hover:text-link-active hover:underline transition-colors"
              >
                {datasetT("backToArea", { area: areaName })}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const boundary = await getAreaBoundary(areaId);

    return (
      <div className="bg-gray-50">
        <div
          className="max-w-7xl mx-auto px-4 py-8 flex flex-col"
          style={{ minHeight: "calc(100vh - var(--nav-height))" }}
        >
          <div className="mb-8 flex-shrink-0">
            <BreadcrumbNav items={breadcrumbItems} />
          </div>

          <DatasetInteractiveSection dataset={dataset} boundary={boundary} savedCount={savedCount} saveLimit={MAX_SAVES_PER_USER} />
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

      if (error.message.includes("Template is deprecated:")) {
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
