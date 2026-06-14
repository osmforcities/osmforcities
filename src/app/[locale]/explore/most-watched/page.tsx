import { prisma } from "@/lib/db";
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
    title: `${t("sections.mostWatched")} - ${t("metaTitle")}`,
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

export default async function MostWatchedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const datasets = await prisma.dataset.findMany({
    where: { isActive: true, dataCount: { gt: 0 } },
    select: {
      ...DATASET_SELECT,
      _count: {
        select: { watchers: true }
      }
    },
    orderBy: { watchers: { _count: 'desc' } },
    take: 24,
  });

  return (
    <ExplorePageLayout>
      <ExploreSectionHeader sectionKey="mostWatched" t={t} />
      {datasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => {
            const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
            const stats = [
              { type: "watchers" as const, label: t("stats.watchers"), value: dataset._count.watchers },
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
