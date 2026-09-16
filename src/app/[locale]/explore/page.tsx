import { prisma } from "@/lib/db";
import { sectionQueryArgs } from "@/lib/dataset-section-select";
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

export default async function FeaturedDatasetsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const [featured, recentlyEdited, mostSaved, mostContributors, largest] = await Promise.all([
    prisma.dataset
      .findMany(sectionQueryArgs("featured", 20))
      .then((datasets) => shuffleArray(datasets).slice(0, 6)),
    prisma.dataset.findMany(sectionQueryArgs("recentlyEdited", 6)),
    prisma.dataset.findMany(sectionQueryArgs("mostSaved", 6)),
    prisma.dataset.findMany(sectionQueryArgs("mostContributors", 6)),
    prisma.dataset.findMany(sectionQueryArgs("largest", 6)),
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
            mostSaved,
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
