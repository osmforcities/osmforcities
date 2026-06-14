import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats } from "@/lib/dataset-stats";
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

export const revalidate = 3600;

// Fisher-Yates shuffle for unbiased random permutation
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  return {
    title: t("metaTitle"),
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

export default async function FeaturedDatasetsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const [featured, recentlyEdited, mostWatched, mostContributors, largest] = await Promise.all([
    prisma.dataset.findMany({
      where: { isFeatured: true, dataCount: { gt: 0 } },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { watchers: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).then(datasets => shuffleArray(datasets).slice(0, 6)),
    prisma.dataset.findMany({
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
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 } },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { watchers: true }
        }
      },
      orderBy: { watchers: { _count: 'desc' } },
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 }, contributorsCount: { not: null } },
      select: {
        ...DATASET_SELECT,
        contributorsCount: true,
        _count: {
          select: { watchers: true }
        }
      },
      orderBy: { contributorsCount: "desc" },
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 } },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { watchers: true }
        }
      },
      orderBy: { dataCount: "desc" },
      take: 6,
    }),
  ]);

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

        {/* Featured Section */}
        {featured.length > 0 && (
          <Section
            title={t("sections.featured")}
            seeAllHref={`/${locale}/explore/featured`}
            t={t}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((dataset) => {
                const s = processDatasetStats(dataset, locale);
                const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
                const stats = [
                  { type: "features" as const, label: t("stats.features"), value: s.features },
                  { type: "contributors" as const, label: t("stats.contributors"), value: s.contributors },
                  { type: "lastEdited" as const, label: t("stats.lastEdited"), value: s.lastEdited },
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
          </Section>
        )}

        {/* Recently Edited Section */}
        {recentlyEdited.length > 0 && (
          <Section
            title={t("sections.recentlyEdited")}
            seeAllHref={`/${locale}/explore/recently-edited`}
            t={t}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentlyEdited.map((dataset) => {
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
          </Section>
        )}

        {/* Most Watched Section */}
        {mostWatched.length > 0 && (
          <Section
            title={t("sections.mostWatched")}
            seeAllHref={`/${locale}/explore/most-watched`}
            t={t}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mostWatched.map((dataset) => {
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
          </Section>
        )}

        {/* Most Contributors Section */}
        {mostContributors.length > 0 && (
          <Section
            title={t("sections.mostContributors")}
            seeAllHref={`/${locale}/explore/most-contributors`}
            t={t}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mostContributors.map((dataset) => {
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
          </Section>
        )}

        {/* Largest Section */}
        {largest.length > 0 && (
          <Section
            title={t("sections.largest")}
            seeAllHref={`/${locale}/explore/largest`}
            t={t}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {largest.map((dataset) => {
                const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
                const stats = [
                  { type: "features" as const, label: t("stats.features"), value: dataset.dataCount },
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
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  seeAllHref,
  children,
  t,
}: {
  title: string;
  seeAllHref: string | null;
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            {t("seeAll")}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
