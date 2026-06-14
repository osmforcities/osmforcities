import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats, getDatasetStats } from "@/lib/dataset-stats";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";

export const revalidate = 300;

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

const SECTIONS = ["featured", "largest", "most-watched"] as const;
type Section = (typeof SECTIONS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; section: string }>;
}) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const sectionKey = section === "largest" ? "largest" : section === "most-watched" ? "mostWatched" : "featured";
  const title = t.raw(`sections.${sectionKey}`);

  return {
    title: `${title} - ${t("metaTitle")}`,
  };
}

const DATASET_SELECT = {
  id: true,
  cityName: true,
  dataCount: true,
  stats: true,
  areaId: true,
  templateId: true,
  createdAt: true,
  area: {
    select: {
      id: true,
      countryCode: true,
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

export default async function ExploreSectionPage({
  params,
}: {
  params: Promise<{ locale: Locale; section: string }>;
}) {
  const { locale, section: sectionParam } = await params;

  if (!SECTIONS.includes(sectionParam as Section)) {
    notFound();
  }

  const section = sectionParam as Section;

  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const datasets = await getDatasets(section as Section);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <Link
            href={`/${locale}/explore`}
            className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            {t("backToExplore")}
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
            {t(`sections.${sectionKey(section)}`)}
          </h1>
        </div>

        {datasets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => {
              const s = processDatasetStats(dataset, locale);
              const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
              const stats = getDatasetStats(dataset, s, t, section);

              return (
                <DatasetCard
                  key={dataset.id}
                  name={resolvedTemplate.name}
                  city={dataset.cityName}
                  country={dataset.area.countryCode ?? ""}
                  category={resolvedTemplate.category?.name ?? "other"}
                  href={`/${locale}/area/${dataset.areaId}/dataset/${dataset.templateId}`}
                  stats={stats}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-400">
            {t("noDatasetsFound")}
          </div>
        )}
      </div>
    </div>
  );
}

function sectionKey(section: Section): "featured" | "largest" | "mostWatched" {
  switch (section) {
    case "largest":
      return "largest";
    case "most-watched":
      return "mostWatched";
    default:
      return "featured";
  }
}

async function getDatasets(section: Section) {
  const selectWithWatchers = {
    ...DATASET_SELECT,
    _count: {
      select: { watchers: true }
    }
  };

  switch (section) {
    case "featured":
      return prisma.dataset.findMany({
        where: { isFeatured: true, dataCount: { gt: 0 } },
        select: selectWithWatchers,
        orderBy: { createdAt: "desc" },
        take: 24,
      });
    case "largest":
      return prisma.dataset.findMany({
        where: { isActive: true, dataCount: { gt: 0 } },
        select: selectWithWatchers,
        orderBy: { dataCount: "desc" },
        take: 24,
      });
    case "most-watched":
      return prisma.dataset.findMany({
        where: { isActive: true, dataCount: { gt: 0 } },
        select: selectWithWatchers,
        orderBy: { watchers: { _count: 'desc' } },
        take: 24,
      });
  }
}
