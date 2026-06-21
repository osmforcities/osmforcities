import { prisma } from "@/lib/db";
import { CATALOG_FILTER } from "@/lib/dataset-catalog-filter";
import { DatasetSections } from "@/components/dataset/dataset-sections";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";

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
          select: { savedBy: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).then(datasets => shuffleArray(datasets).slice(0, 6)),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 }, lastEditedAt: { not: null }, ...CATALOG_FILTER },
      select: {
        ...DATASET_SELECT,
        recentlyEditedCount: true,
        lastEditedAt: true,
        _count: {
          select: { savedBy: true }
        }
      },
      orderBy: { lastEditedAt: "desc" },
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 }, savedBy: { some: {} } },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { savedBy: true }
        }
      },
      orderBy: { savedBy: { _count: 'desc' } },
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 }, contributorsCount: { not: null }, ...CATALOG_FILTER },
      select: {
        ...DATASET_SELECT,
        contributorsCount: true,
        _count: {
          select: { savedBy: true }
        }
      },
      orderBy: { contributorsCount: "desc" },
      take: 6,
    }),
    prisma.dataset.findMany({
      where: { isActive: true, dataCount: { gt: 0 }, ...CATALOG_FILTER },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { savedBy: true }
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

        <DatasetSections
          data={{
            featured,
            recentlyEdited,
            mostSaved: mostWatched,
            mostContributors,
            largest,
          }}
          locale={locale}
          seeAllHrefs={{
            featured: "/explore/featured",
            recentlyEdited: "/explore/recently-edited",
            mostSaved: "/explore/most-saved",
            mostContributors: "/explore/most-contributors",
            largest: "/explore/largest",
          }}
        />
      </div>
    </div>
  );
}
