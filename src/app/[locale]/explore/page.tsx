import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats } from "@/lib/dataset-stats";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  return {
    title: t("metaTitle"),
  };
}

export default async function FeaturedDatasetsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");
  const datasets = await prisma.dataset.findMany({
    where: { isFeatured: true },
    include: {
      area: true,
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t("title")}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t("description")}
          </p>
        </div>

        {datasets.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("noDatasets")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => {
              const s = processDatasetStats(dataset, locale);
              return (
                <DatasetCard
                  key={dataset.id}
                  name={dataset.template.name}
                  city={dataset.cityName}
                  country={dataset.area.countryCode ?? ""}
                  category={dataset.template.category}
                  href={`/${locale}/area/${dataset.areaId}/dataset/${dataset.templateId}`}
                  stats={[
                    { type: "features",     label: t("stats.features"),     value: s.features },
                    { type: "contributors", label: t("stats.contributors"), value: s.contributors },
                    { type: "lastEdited",   label: t("stats.lastEdited"),   value: s.lastEdited },
                  ]}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
