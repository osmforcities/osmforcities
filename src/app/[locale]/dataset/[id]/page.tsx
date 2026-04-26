import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { DatasetSchema, type Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/dataset-actions-section";
import { DatasetLayout } from "@/components/dataset/dataset-layout";
import { trackEvent } from "@/lib/umami";
import { getAreaBoundary } from "@/lib/area-boundary";
import type { Metadata } from "next";
import { getLocalizedMetadata } from "@/lib/metadata";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_SEO } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";

async function getDataset(id: string, locale: string): Promise<Dataset | null> {
  try {
    const session = await auth();
    const user = session?.user || null;

    const rawDataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        template: { include: { translations: true } },
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

    const resolvedTemplate = resolveTemplateForLocale(
      rawDataset.template,
      locale,
    );

    return DatasetSchema.parse({
      ...rawDataset,
      template: resolvedTemplate,
      geojson: rawDataset.geojson as FeatureCollection | null,
      bbox: rawDataset.bbox as number[] | null,
      area: {
        ...rawDataset.area,
        geojson: rawDataset.area.geojson as FeatureCollection | null,
      },
      isWatched: user ? rawDataset.watchers.length > 0 : false,
      watchersCount: rawDataset._count.watchers,
      canDelete: false,
    });
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: Locale }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const dataset = await getDataset(id, locale);

  if (!dataset) {
    return {
      title: "Dataset not found - OSM for Cities",
    };
  }

  const t = await getTranslations("SEO");

  return getLocalizedMetadata(locale, {
    title: t("dataset.title", {
      template: dataset.template.name,
      area: dataset.area.name,
    }),
    description: t("dataset.description", {
      description: dataset.template.description || dataset.template.name,
      area: dataset.area.name,
    }),
    path: `/dataset/${id}`,
    noIndex: true,
  });
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string; locale: Locale }>;
}) {
  const { id, locale } = await params;
  const dataset = await getDataset(id, locale);

  if (!dataset) {
    return notFound();
  }

  const boundary = await getAreaBoundary(dataset.area.id);

  trackEvent("dataset_detail_view", `/datasets/${id}/view`);

  const siteUrl = DEFAULT_SEO.siteUrl;

  return (
    <>
      <StructuredData
        id="structured-data-webpage"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${dataset.template.name} in ${dataset.area.name}`,
          description: dataset.template.description || dataset.template.name,
          url: `${siteUrl}/${locale}/dataset/${id}`,
          inLanguage: locale,
        }}
      />
      <StructuredData
        id="structured-data-dataset"
        schema={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: dataset.template.name,
          description: dataset.template.description || dataset.template.name,
          url: `${siteUrl}/${locale}/dataset/${id}`,
          creator: {
            "@type": "Organization",
            name: "OpenStreetMap",
            url: "https://www.openstreetmap.org/",
          },
          spatial: {
            "@type": "Place",
            name: dataset.area.name,
          },
          dateModified: dataset.updatedAt.toISOString(),
          license: "https://opendatacommons.org/licenses/odbl/",
        }}
      />
      <StructuredData
        id="structured-data-breadcrumb"
        schema={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${siteUrl}/${locale}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: dataset.area.name,
              item: `${siteUrl}/${locale}/area/${dataset.area.id}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: dataset.template.name,
              item: `${siteUrl}/${locale}/dataset/${id}`,
            },
          ],
        }}
      />
      <DatasetLayout
        infoPanel={
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-6">
              <DatasetInfoPanel dataset={dataset} />
              <DatasetStatsTable dataset={dataset} />
            </div>
            <DatasetActionsSection dataset={dataset} />
          </div>
        }
        mapPanel={<DatasetMapWrapper dataset={dataset} boundary={boundary} />}
      />
    </>
  );
}
