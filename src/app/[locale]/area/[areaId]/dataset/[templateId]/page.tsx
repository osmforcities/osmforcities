import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { transformDataset } from "@/lib/dataset/transform";
import { DatasetInteractiveSection } from "@/components/dataset/dataset-interactive-section";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import { DatasetTooLargeError } from "@/lib/dataset-snapshot";
import { getAreaDetailsById } from "@/lib/nominatim";
import { resolveAreaName } from "@/lib/area-name";
import {
  isValidTemplateIdentifier,
  resolveTemplate,
} from "@/lib/template-resolver";
import { DatasetLoadingSkeleton } from "@/components/ui/dataset-loading-skeleton";
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
  const session = await auth();
  if (!session?.user) {
    const [template, areaInfo] = await Promise.all([
      resolveTemplate(templateId),
      getAreaDetailsById(osmRelationId, locale),
    ]);

    if (!template) {
      return <TemplateNotFoundError templateId={templateId} />;
    }
    if (!areaInfo) {
      return <AreaNotFoundError areaId={areaId} />;
    }

    // Featured datasets are public: render the full view without a session.
    // Direct lookup only — anonymous visits must not create datasets.
    const featuredDataset = await prisma.dataset.findFirst({
      where: {
        areaId: osmRelationId,
        templateId: template.id,
        isActive: true,
        isFeatured: true,
      },
      select: { id: true },
    });

    if (featuredDataset) {
      return (
        <Suspense fallback={<DatasetLoadingSkeleton />}>
          <AreaTemplateDatasetView
            areaId={osmRelationId}
            templateId={templateId}
            session={null}
          />
        </Suspense>
      );
    }

    return (
      <>
        <TrackView
          event={ANALYTICS_EVENTS.DATASET_UPSELL_VIEW}
          url={`/area/${areaId}/dataset/${encodeURIComponent(templateId)}/upsell`}
        />
        <DatasetUpsellPage
          datasetName={template.name}
          areaName={resolveAreaName(areaInfo, locale)}
          areaId={areaId}
        />
      </>
    );
  }

  return (
    <Suspense fallback={<DatasetLoadingSkeleton />}>
      <AreaTemplateDatasetView
        areaId={osmRelationId}
        templateId={templateId}
        session={session}
      />
    </Suspense>
  );
}

async function AreaTemplateDatasetView({
  areaId,
  templateId,
  session,
}: {
  areaId: number;
  templateId: string;
  session: Awaited<ReturnType<typeof auth>> | null;
}) {
  const locale = await getLocale();

  try {
    const [result, areaInfo] = await Promise.all([
      getOrCreateDataset(areaId, templateId, locale, {
        allowCreate: !!session?.user,
      }),
      getAreaDetailsById(areaId, locale),
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
        <div className="bg-gray-50">
          {trackDetailView}
          <div
            className="max-w-7xl mx-auto px-4 py-8 flex flex-col"
            style={{ minHeight: "calc(100vh - var(--nav-height))" }}
          >
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
      <div className="bg-gray-50 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex lg:overflow-hidden">
        {trackDetailView}
        <DatasetInteractiveSection dataset={dataset} boundary={boundary} savedCount={savedCount} saveLimit={MAX_SAVES_PER_USER} />
      </div>
    );
  } catch (error) {
    if (error instanceof DatasetTooLargeError) {
      const [template, areaInfo] = await Promise.all([
        resolveTemplate(templateId),
        getAreaDetailsById(areaId, locale),
      ]);
      return (
        <DatasetTooLargeState
          templateName={template?.name ?? templateId}
          areaName={areaInfo ? resolveAreaName(areaInfo, locale) : String(areaId)}
          areaId={areaId}
          overpassQuery={
            template?.overpassQuery.replace(
              /\{OSM_RELATION_ID\}/g,
              String(areaId)
            ) ?? null
          }
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
