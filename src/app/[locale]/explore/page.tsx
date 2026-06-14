import { prisma } from "@/lib/db";
import { DatasetCard } from "@/components/ui/dataset-card";
import { processDatasetStats, getDatasetStats } from "@/lib/dataset-stats";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";

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

  const [featured, largest, mostWatched] = await Promise.all([
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
            <DatasetGrid
              datasets={featured}
              locale={locale}
              t={t}
              statType="default"
            />
          </Section>
        )}

        {/* Largest Section */}
        {largest.length > 0 && (
          <Section
            title={t("sections.largest")}
            seeAllHref={`/${locale}/explore/largest`}
            t={t}
          >
            <DatasetGrid
              datasets={largest}
              locale={locale}
              t={t}
              statType="largest"
            />
          </Section>
        )}

        {/* Most Watched Section */}
        {mostWatched.length > 0 && (
          <Section
            title={t("sections.mostWatched")}
            seeAllHref={`/${locale}/explore/most-watched`}
            t={t}
          >
            <DatasetGrid
              datasets={mostWatched}
              locale={locale}
              t={t}
              statType="most-watched"
            />
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

function DatasetGrid({
  datasets,
  locale,
  t,
  statType,
}: {
  datasets: Array<{
    id: string;
    cityName: string;
    dataCount: number;
    stats: import("@prisma/client").Prisma.JsonValue;
    areaId: number;
    templateId: string;
    createdAt: Date;
    area: { id: number; countryCode: string | null };
    template: {
      id: string;
      name: string;
      description: string | null;
      category: { id: string; name: string; slug: string } | null;
      translations: Array<{
        locale: string;
        name: string;
        description: string | null;
      }>;
    };
    _count: {
      watchers: number;
    };
  }>;
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  statType: "default" | "largest" | "most-watched";
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {datasets.map((dataset) => {
        const s = processDatasetStats(dataset, locale);
        const resolvedTemplate = resolveTemplateForLocale(dataset.template, locale);
        const stats = getDatasetStats(dataset, s, t, statType);

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
  );
}
