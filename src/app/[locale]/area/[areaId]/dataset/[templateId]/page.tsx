import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { transformDataset } from "@/lib/dataset/transform";
import { DatasetInteractiveSection } from "@/components/dataset/dataset-interactive-section";
import { DatasetNoMapPage } from "@/components/ui/dataset-no-map-page";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import {
  DatasetSizeCheckTimeoutError,
  DatasetTooLargeError,
} from "@/lib/dataset-snapshot";
import { getAreaDetailsById } from "@/lib/nominatim";
import { resolveAreaName } from "@/lib/area-name";
import {
  isValidTemplateIdentifier,
  resolveTemplate,
} from "@/lib/template-resolver";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import type { Area } from "@/types/area";
import { DatasetLoadingSkeleton } from "@/components/ui/dataset-loading-skeleton";
import { DatasetWaitPage } from "@/components/dataset/dataset-wait-page";
import {
  TemplateNotFoundError,
  AreaNotFoundError,
  DatasetCreationError,
  DatasetTooLargeState,
} from "@/components/ui/dataset-error-states";
import { DatasetUpsellPage } from "@/components/dataset/dataset-upsell-page";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { TrackView } from "@/components/analytics/track-view";
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

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId) || osmRelationId <= 0) {
    notFound();
  }

  if (!isValidTemplateIdentifier(templateId)) {
    return <TemplateNotFoundError templateId={templateId} />;
  }

  const locale = await getLocale();
  const [session, template, areaInfo] = await Promise.all([
    auth(),
    resolveTemplate(templateId),
    getAreaDetailsById(osmRelationId, locale),
  ]);

  if (!template) {
    return <TemplateNotFoundError templateId={templateId} />;
  }

  // Known before the dataset exists, so the wait screens can name it
  const templateName = resolveTemplateForLocale(template, locale).name;
  const areaName = areaInfo
    ? resolveAreaName(areaInfo, locale)
    : String(osmRelationId);

  const existing = await prisma.dataset.findFirst({
    where: { areaId: osmRelationId, templateId: template.id, isActive: true },
    select: { isFeatured: true },
  });

  const view = (
    <AreaTemplateDatasetView
      areaId={osmRelationId}
      templateId={templateId}
      templateName={templateName}
      areaInfo={areaInfo}
      areaName={areaName}
      locale={locale}
      session={session}
    />
  );

  if (!session?.user) {
    if (!areaInfo) {
      return <AreaNotFoundError areaId={areaId} />;
    }

    // Featured datasets are public: render the full view without a session.
    // Anonymous visits must not create datasets.
    if (existing?.isFeatured) {
      return <Suspense fallback={<DatasetLoadingSkeleton />}>{view}</Suspense>;
    }

    return (
      <>
        <TrackView
          event={ANALYTICS_EVENTS.DATASET_UPSELL_VIEW}
          url={`/area/${areaId}/dataset/${encodeURIComponent(templateId)}/upsell`}
        />
        <DatasetUpsellPage
          datasetName={templateName}
          areaName={areaName}
          areaId={areaId}
        />
      </>
    );
  }

  // A missing row means the view counts elements before creating it, which
  // can take a while: show the counting screen instead of a skeleton.
  return (
    <Suspense
      fallback={
        existing ? (
          <DatasetLoadingSkeleton />
        ) : (
          <DatasetWaitPage
            mood="counting"
            templateName={templateName}
            areaName={areaName}
            areaId={osmRelationId}
          />
        )
      }
    >
      {view}
    </Suspense>
  );
}

async function AreaTemplateDatasetView({
  areaId,
  templateId,
  templateName,
  areaInfo,
  areaName: fallbackAreaName,
  locale,
  session,
}: {
  areaId: number;
  templateId: string;
  templateName: string;
  areaInfo: Area | null;
  /** Shown on failure screens, before any dataset row can name the area */
  areaName: string;
  locale: string;
  session: Awaited<ReturnType<typeof auth>> | null;
}) {
  try {
    const result = await getOrCreateDataset(areaId, templateId, locale, {
      allowCreate: !!session?.user,
    });

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

    const trackDetailView = (
      <TrackView
        event={ANALYTICS_EVENTS.DATASET_DETAIL_VIEW}
        url={`/area/${areaId}/dataset/${encodeURIComponent(templateId)}/view`}
      />
    );

    const areaName = areaInfo
      ? resolveAreaName(areaInfo, locale)
      : resolveAreaName(dataset.area, locale);

    // Empty state: dataset has no features in this area.
    if (result.dataset.dataCount === 0) {
      const datasetT = await getTranslations("DatasetPage");
      return (
        <>
          {trackDetailView}
          <DatasetNoMapPage
            areaId={areaId}
            backLabel={datasetT("backToAreaLabel", { area: areaName })}
            title={datasetT("datasetInArea", {
              dataset: dataset.template.name,
              area: areaName,
            })}
            lead={datasetT("stateNoData")}
            description={datasetT("emptyDescription")}
          />
        </>
      );
    }

    const boundary = await getAreaBoundary(areaId);

    return (
      <div className="bg-gray-50 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex lg:overflow-hidden">
        {trackDetailView}
        <DatasetInteractiveSection dataset={dataset} boundary={boundary} areaName={areaName} savedCount={savedCount} saveLimit={MAX_SAVES_PER_USER} />
      </div>
    );
  } catch (error) {
    if (error instanceof DatasetTooLargeError) {
      return (
        <DatasetTooLargeState
          templateName={templateName}
          areaName={fallbackAreaName}
          areaId={areaId}
        />
      );
    }

    if (error instanceof DatasetSizeCheckTimeoutError) {
      return (
        <DatasetWaitPage
          mood="timedOut"
          templateName={templateName}
          areaName={fallbackAreaName}
          areaId={areaId}
        />
      );
    }

    if (error instanceof Error) {
      if (error.message.startsWith("Template not found:")) {
        return <TemplateNotFoundError templateId={templateId} />;
      }

      if (error.message.startsWith("Area not found:")) {
        return <AreaNotFoundError areaId={areaId.toString()} />;
      }

      // Anonymous view raced a dataset deactivation (allowCreate: false)
      if (error.message.startsWith("Dataset not found:")) {
        notFound();
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
