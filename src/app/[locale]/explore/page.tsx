import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats } from "@/lib/dataset-stats";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ExplorePage" });

  return {
    title: t("metaTitle"),
  };
}

export default async function FeaturedDatasetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ExplorePage" });
  const datasets = await prisma.dataset.findMany({
    where: { isFeatured: true },
    include: {
      area: true,
      template: true,
      _count: { select: { watchers: true } },
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
            {datasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                name={dataset.template.name}
                city={dataset.cityName}
                country={dataset.area.countryCode ?? ""}
                category={dataset.template.category}
                href={`/area/${dataset.areaId}/dataset/${dataset.templateId}`}
                stats={[
                  {
                    label: "Features",
                    value: processDatasetStats(dataset).features,
                  },
                  {
                    label: "Contributors",
                    value: processDatasetStats(dataset).contributors,
                  },
                  {
                    label: "Last edited",
                    value: processDatasetStats(dataset).lastEdited,
                  },
                ]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
