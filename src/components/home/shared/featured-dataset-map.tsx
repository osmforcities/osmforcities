import { unstable_cache } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { processDatasetStats } from "@/lib/dataset-stats";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { datasetPagePath, parseAreaBounds } from "@/lib/utils";
import { HeroMap } from "./hero-map";
import { FeaturedDatasetMapClient } from "./featured-dataset-map-client";

const FEATURED_DATASET_SELECT = {
  id: true,
  cityName: true,
  dataCount: true,
  stats: true,
  areaId: true,
  templateId: true,
  area: {
    select: {
      id: true,
      countryCode: true,
      bounds: true,
    },
  },
  template: {
    select: {
      id: true,
      name: true,
      description: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      translations: {
        select: {
          locale: true,
          name: true,
          description: true,
        },
      },
    },
  },
} as const;

const getFeaturedDatasets = unstable_cache(
  () =>
    prisma.dataset.findMany({
      where: { isFeatured: true, dataCount: { gt: 0 } },
      select: FEATURED_DATASET_SELECT,
    }),
  ["featured-datasets-hero"],
  { revalidate: 300, tags: ["featured-datasets"] }
);

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function FeaturedDatasetMap() {
  const datasets = await getFeaturedDatasets();

  if (datasets.length === 0) {
    return <HeroMap />;
  }

  const locale = await getLocale();
  const t = await getTranslations("Home.featuredDataset");

  const dataset = shuffle(datasets)[0];
  const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
  const stats = processDatasetStats(dataset, locale);

  return (
    <FeaturedDatasetMapClient
      datasetId={dataset.id}
      areaId={dataset.areaId}
      bounds={parseAreaBounds(dataset.area)}
      title={t("title", {
        template: resolvedTemplate.name,
        city: dataset.cityName,
      })}
      category={resolvedTemplate.category?.name ?? "other"}
      stats={stats}
      href={datasetPagePath(locale, dataset.areaId, dataset.templateId)}
    />
  );
}
