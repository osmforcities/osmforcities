import { prisma } from "@/lib/db";
import { CATALOG_FILTER } from "@/lib/dataset-catalog-filter";
import { DatasetCard } from "@/components/ui/dataset-card";
import { ExplorePageLayout, ExploreSectionHeader } from "@/components/explore/explore-components";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  return {
    title: `${t("sections.mostContributors")} - ${t("metaTitle")}`,
  };
}

const DATASET_SELECT = {
  id: true,
  cityName: true,
  dataCount: true,
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

export default async function MostContributorsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const datasets = await prisma.dataset.findMany({
    where: { isActive: true, dataCount: { gt: 0 }, contributorsCount: { not: null }, ...CATALOG_FILTER },
    select: {
      ...DATASET_SELECT,
      contributorsCount: true,
      _count: {
        select: { savedBy: true }
      }
    },
    orderBy: { contributorsCount: "desc" },
    take: 24,
  });

  return (
    <ExplorePageLayout>
      <ExploreSectionHeader sectionKey="mostContributors" t={t} />
      {datasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => {
            const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
            const stats = [
              { type: "contributors" as const, label: t("stats.contributors"), value: dataset.contributorsCount || 0 },
            ];

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
    </ExplorePageLayout>
  );
}
