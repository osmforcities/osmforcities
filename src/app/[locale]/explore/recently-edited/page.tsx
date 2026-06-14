import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";

function formatRelativeTime(timestamp: Date | null | undefined, locale: string): string {
  if (!timestamp) return "—";

  const diffMs = timestamp.getTime() - Date.now();
  const absSec = Math.abs(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffMs / 86400000), "day");
  if (absSec < 31536000) return rtf.format(Math.round(diffMs / 2592000000), "month");
  return rtf.format(Math.round(diffMs / 31536000000), "year");
}

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
    title: `${t("sections.recentlyEdited")} - ${t("metaTitle")}`,
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

export default async function RecentlyEditedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const datasets = await prisma.dataset.findMany({
    where: { isActive: true, dataCount: { gt: 0 }, recentlyEditedCount: { not: null } },
    select: {
      ...DATASET_SELECT,
      recentlyEditedCount: true,
      lastEditedAt: true,
      _count: {
        select: { watchers: true }
      }
    },
    orderBy: { lastEditedAt: "desc" },
    take: 24,
  });

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
            {t("sections.recentlyEdited")}
          </h1>
        </div>

        {datasets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => {
              const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
              const lastEdited = formatRelativeTime(dataset.lastEditedAt, locale);
              const stats = [
                { type: "lastEdited" as const, label: t("stats.lastEdited"), value: lastEdited },
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
      </div>
    </div>
  );
}
