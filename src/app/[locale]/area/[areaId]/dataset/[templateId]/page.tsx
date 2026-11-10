import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_SEO, getLocalizedMetadata } from "@/lib/metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { transformDataset } from "@/lib/dataset/transform";
import { DatasetInteractiveSection } from "@/components/dataset/dataset-interactive-section";
import { DatasetNoMapPage } from "@/components/ui/dataset-no-map-page";
import { SaveAndNotifyButton } from "@/components/dataset/save-and-notify-button";
import { NotifyWhenReadyButton } from "@/components/dataset/notify-when-ready-button";
import { tilerEnabled } from "@/lib/tiler/client";
import { retryFailedBake, tilesOnlyLaneEnabled } from "@/lib/tiler/submit";
import { isTooLarge } from "@/lib/dataset-retry";
import { awaitsFirstMap } from "@/lib/dataset-tiles";
import { getOrCreateDataset } from "@/lib/dataset-operations";
import { resumeCountProbeIfDue } from "@/lib/dataset-count-probe";
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
import { categoryPagePath } from "@/lib/template-topics";
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
import { getDatasetPath } from "@/lib/urls";

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

  // Without a replacement, a retired template still shows "not found" further down
  if (template.deprecatesAt && template.replacedById) {
    redirect({ href: `/area/${osmRelationId}/dataset/${template.replacedById}`, locale });
  }

  // Known before the dataset exists, so the wait screens can name it
  const templateName = resolveTemplateForLocale(template, locale).name;
  const categoryHref = categoryPagePath(osmRelationId, template.category);
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
      categoryHref={categoryHref}
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
          returnTo={getDatasetPath({ locale, areaId: osmRelationId, templateId })}
        />
      </>
    );
  }

  // A missing row takes a while to create (the whole count with the tiles-only
  // lane off), so the counting screen shows meanwhile. On the lane the disabled
  // button keeps the screen from shifting when the real one arrives.
  const tilesLane = tilesOnlyLaneEnabled();
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
            categoryHref={categoryHref}
            areaId={osmRelationId}
            notify={
              tilesLane && <NotifyWhenReadyButton offer="ready" disabled />
            }
          />
        )
      }
    >
      {view}
    </Suspense>
  );
}

function waitPageMood(tilesState: string | null, probeRunning: boolean) {
  if (tilesState === "counting") return probeRunning ? "counting" : "timedOut";
  return tilesState === "pending" ? "baking" : "failed";
}

async function AreaTemplateDatasetView({
  areaId,
  categoryHref,
  templateId,
  templateName,
  areaInfo,
  areaName: fallbackAreaName,
  locale,
  session,
}: {
  areaId: number;
  categoryHref: string;
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
    let notifyRequested = false;
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
      notifyRequested = !!saveRecord?.notifyWhenReady;
      savedCount = count;
    }

    // No detail-view tracker: the flip to the map remounts the page and would
    // count the view twice
    let row = result.dataset;
    if (tilesOnlyLaneEnabled() && awaitsFirstMap(row)) {
      // A failed bake is retried by a later visit, not the creating one
      if (!result.wasCreated) {
        row = { ...row, ...(await retryFailedBake(row)) };
      }
      const probeRunning =
        row.tilesState === "counting" && (await resumeCountProbeIfDue(row));
      // Saving needs a session; anonymous visitors reach here on featured pages
      const notify = (offer: "ready" | "available") =>
        session?.user && (
          <SaveAndNotifyButton
            datasetId={row.id}
            saved={isSaved}
            notify={notifyRequested}
            offer={offer}
          />
        );
      if (row.tilesState === "failed" && isTooLarge(row.tilesError)) {
        return (
          <DatasetTooLargeState
            templateName={templateName}
            areaName={fallbackAreaName}
            categoryHref={categoryHref}
            areaId={areaId}
            notify={notify("available")}
          />
        );
      }
      return (
        <DatasetWaitPage
          datasetId={row.id}
          mood={waitPageMood(row.tilesState, probeRunning)}
          templateName={templateName}
          areaName={fallbackAreaName}
          categoryHref={categoryHref}
          areaId={areaId}
          notify={notify("ready")}
        />
      );
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
            categoryHref={categoryHref}
            areaId={areaId}
            title={datasetT("datasetInArea", {
              dataset: dataset.template.name,
              area: areaName,
            })}
            lead={datasetT("stateNoData")}
            description={datasetT("emptyDescription")}
            action={
              // The mail is sent only by a bake, so no tiler means no offer.
              session?.user && tilerEnabled() && (
                <SaveAndNotifyButton
                  datasetId={result.dataset.id}
                  saved={isSaved}
                  notify={notifyRequested}
                  offer="mapped"
                />
              )
            }
          />
        </>
      );
    }

    const boundary = await getAreaBoundary(areaId);

    return (
      <div className="bg-gray-50 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex lg:overflow-hidden">
        {trackDetailView}
        <DatasetInteractiveSection dataset={dataset} boundary={boundary} areaName={areaName} categoryHref={categoryHref} savedCount={savedCount} saveLimit={MAX_SAVES_PER_USER} />
      </div>
    );
  } catch (error) {
    if (error instanceof DatasetTooLargeError) {
      return (
        <DatasetTooLargeState
          templateName={templateName}
          areaName={fallbackAreaName}
          categoryHref={categoryHref}
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
          categoryHref={categoryHref}
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

export async function generateMetadata({ params }: DatasetPageProps): Promise<Metadata> {
  const { areaId, templateId } = await params;
  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId) || !isValidTemplateIdentifier(templateId)) return {};

  const locale = await getLocale();
  const [template, areaInfo, t] = await Promise.all([
    // The layout defaults stand in for a page that can't be named
    resolveTemplate(templateId).catch(() => null),
    getAreaDetailsById(osmRelationId, locale),
    getTranslations("DatasetPage"),
  ]);
  if (!template || !areaInfo) return {};

  const { name, description } = resolveTemplateForLocale(template, locale);
  return getLocalizedMetadata(locale as Locale, {
    title: t("datasetInArea", { dataset: name, area: resolveAreaName(areaInfo, locale) }),
    description: description ?? DEFAULT_SEO.description,
    path: `/area/${osmRelationId}/dataset/${templateId}`,
  });
}
