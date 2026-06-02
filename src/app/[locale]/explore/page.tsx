import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats } from "@/lib/dataset-stats";
import { getAreaDetailsById } from "@/lib/nominatim";
import { resolveTemplateForLocale } from "@/lib/template-locale";
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
      area: {
        select: {
          id: true,
          countryCode: true,
        },
      },
      template: {
        include: {
          translations: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Backfill missing country codes from Nominatim (lazy, fires once per unique area)
  const seen = new Set<number>();
  const missing = datasets.filter((d) => {
    if (d.area.countryCode || seen.has(d.area.id)) return false;
    seen.add(d.area.id);
    return true;
  });
  if (missing.length > 0) {
    const results = await Promise.allSettled(
      missing.map(async (d) => {
        const details = await getAreaDetailsById(d.area.id);
        if (details?.countryCode) {
          await prisma.area.update({
            where: { id: d.area.id },
            data: { countryCode: details.countryCode },
          });
          return { areaId: d.area.id, countryCode: details.countryCode };
        }
        return null;
      })
    );

    // Propagate backfilled codes to all datasets sharing the same area
    const backfilledByArea = new Map<number, string>();
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        backfilledByArea.set(result.value.areaId, result.value.countryCode);
      } else if (result.status === "rejected") {
        console.error("Failed to backfill area country code:", result.reason);
      }
    }
    for (const dataset of datasets) {
      const code = backfilledByArea.get(dataset.area.id);
      if (code) {
        dataset.area.countryCode = code;
      }
    }
  }

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
              const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
              return (
                <DatasetCard
                  key={dataset.id}
                  name={resolvedTemplate.name}
                  city={dataset.cityName}
                  country={dataset.area.countryCode ?? ""}
                  category={resolvedTemplate.category?.name ?? "other"}
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
