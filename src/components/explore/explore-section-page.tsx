import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { sectionQueryArgs, type DatasetSectionKey } from "@/lib/dataset-section-select";
import { DatasetSectionGrid } from "@/components/dataset/dataset-sections";
import { ExplorePageLayout, ExploreSectionHeader } from "@/components/explore/explore-components";

type PageParams = Promise<{ locale: Locale }>;

export async function exploreSectionMetadata(
  section: DatasetSectionKey,
  params: PageParams
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  return {
    title: `${t(`sections.${section}`)} - ${t("metaTitle")}`,
  };
}

/**
 * Shared body of the explore see-all pages — one section, 24 cards.
 */
export async function ExploreSectionPage({
  section,
  params,
}: {
  section: DatasetSectionKey;
  params: PageParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ExplorePage");

  const datasets = await prisma.dataset.findMany(sectionQueryArgs(section, 24));

  return (
    <ExplorePageLayout>
      <ExploreSectionHeader sectionKey={section} t={t} />
      {datasets.length > 0 ? (
        <DatasetSectionGrid section={section} datasets={datasets} locale={locale} />
      ) : (
        <div className="text-center py-12 text-neutral-400">
          {t("noDatasetsFound")}
        </div>
      )}
    </ExplorePageLayout>
  );
}
