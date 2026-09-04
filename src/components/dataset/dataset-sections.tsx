import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DatasetCard } from "@/components/ui/dataset-card";
import type { StatType } from "@/components/ui/dataset-stats-row";
import { processDatasetStats, formatRelativeTime } from "@/lib/dataset-stats";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { resolveDatasetAreaName } from "@/lib/area-name";
import { getDatasetPath } from "@/lib/urls";
import type { DatasetSectionKey } from "@/lib/dataset-section-select";

type SectionTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; name: string; slug: string } | null;
  translations: Array<{ locale: string; name: string; description: string | null }>;
};

export type SectionDataset = {
  id: string;
  cityName: string;
  dataCount: number;
  stats: Prisma.JsonValue;
  areaId: number;
  templateId: string;
  area: {
    countryCode: string | null;
    name: string;
    names?: unknown;
  };
  template: SectionTemplate;
  _count: { savedBy: number };
  lastEditedAt?: Date | null;
  contributorsCount?: number | null;
};

export type DatasetSectionsData = {
  featured: SectionDataset[];
  recentlyEdited: SectionDataset[];
  mostSaved: SectionDataset[];
  mostContributors: SectionDataset[];
  largest: SectionDataset[];
};

type Stat = { type: StatType; label: string; value: string | number };

type SectionT = Awaited<ReturnType<typeof getTranslations<"ExplorePage">>>;

function sectionStats(
  section: DatasetSectionKey,
  dataset: SectionDataset,
  locale: string,
  t: SectionT
): Stat[] {
  switch (section) {
    case "featured": {
      const s = processDatasetStats(dataset, locale);
      return [
        { type: "features", label: t("stats.features"), value: s.features },
        { type: "contributors", label: t("stats.contributors"), value: s.contributors },
        { type: "lastEdited", label: t("stats.lastEdited"), value: s.lastEdited },
      ];
    }
    case "recentlyEdited":
      return [
        {
          type: "lastEdited",
          label: t("stats.lastEdited"),
          value: formatRelativeTime(dataset.lastEditedAt, locale),
        },
      ];
    case "mostSaved":
      return [
        { type: "savedBy", label: t("stats.saves"), value: dataset._count.savedBy },
      ];
    case "mostContributors":
      return [
        {
          type: "contributors",
          label: t("stats.contributors"),
          value: dataset.contributorsCount || 0,
        },
      ];
    case "largest":
      return [
        { type: "features", label: t("stats.features"), value: dataset.dataCount },
      ];
  }
}

/**
 * The card grid for one dataset section — shared by DatasetSections below and
 * the explore see-all pages.
 */
export async function DatasetSectionGrid({
  section,
  datasets,
  locale,
}: {
  section: DatasetSectionKey;
  datasets: SectionDataset[];
  locale: string;
}) {
  const t = await getTranslations("ExplorePage");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {datasets.map((dataset) => {
        const resolved = resolveTemplateForLocale(dataset.template, locale);
        return (
          <DatasetCard
            key={dataset.id}
            name={resolved.name}
            city={resolveDatasetAreaName(dataset, locale)}
            country={dataset.area.countryCode ?? ""}
            category={resolved.category?.slug ?? "other"}
            templateId={dataset.templateId}
            href={getDatasetPath({ locale, areaId: dataset.areaId, templateId: dataset.templateId })}
            stats={sectionStats(section, dataset, locale, t)}
          />
        );
      })}
    </div>
  );
}

const SECTION_ORDER: DatasetSectionKey[] = [
  "featured",
  "recentlyEdited",
  "mostSaved",
  "mostContributors",
  "largest",
];

/**
 * Shared dataset sections (Featured / Recently Edited / Most Saved /
 * Most Contributors / Largest) used by the Explore page. Renders the same
 * `DatasetCard`s and section layout. Empty sections are hidden.
 */
export async function DatasetSections({
  data,
  locale,
  seeAllHrefs,
}: {
  data: DatasetSectionsData;
  locale: string;
  seeAllHrefs?: Partial<Record<DatasetSectionKey, string>>;
}) {
  const t = await getTranslations("ExplorePage");

  return (
    <>
      {SECTION_ORDER.filter((section) => data[section].length > 0).map((section) => (
        <Section
          key={section}
          title={t(`sections.${section}`)}
          seeAllHref={seeAllHrefs?.[section]}
          seeAllLabel={t("seeAll")}
        >
          <DatasetSectionGrid section={section} datasets={data[section]} locale={locale} />
        </Section>
      ))}
    </>
  );
}

function Section({
  title,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  title: string;
  seeAllHref?: string;
  seeAllLabel: string;
  children: React.ReactNode;
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
            {seeAllLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
