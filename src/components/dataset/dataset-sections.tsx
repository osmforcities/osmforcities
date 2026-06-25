import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DatasetCard, type StatType } from "@/components/ui/dataset-card";
import { processDatasetStats, formatRelativeTime } from "@/lib/dataset-stats";
import { resolveTemplateForLocale } from "@/lib/template-locale";

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
  area: { countryCode: string | null };
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

export type SectionKey = keyof DatasetSectionsData;

type Stat = { type: StatType; label: string; value: string | number };

/**
 * Shared dataset sections (Featured / Recently Edited / Most Saved /
 * Most Contributors / Largest) used by both the Explore page and area pages.
 * Renders the same `DatasetCard`s and section layout. Empty sections are hidden.
 */
export async function DatasetSections({
  data,
  locale,
  seeAllHrefs,
}: {
  data: DatasetSectionsData;
  locale: string;
  seeAllHrefs?: Partial<Record<SectionKey, string>>;
}) {
  const t = await getTranslations("ExplorePage");

  const card = (dataset: SectionDataset, stats: Stat[]) => {
    const resolved = resolveTemplateForLocale(dataset.template, locale);
    return (
      <DatasetCard
        key={dataset.id}
        name={resolved.name}
        city={dataset.cityName}
        country={dataset.area.countryCode ?? ""}
        category={resolved.category?.name ?? "other"}
        href={`/${locale}/area/${dataset.areaId}/dataset/${dataset.templateId}`}
        stats={stats}
      />
    );
  };

  return (
    <>
      {data.featured.length > 0 && (
        <Section
          title={t("sections.featured")}
          seeAllHref={seeAllHrefs?.featured}
          seeAllLabel={t("seeAll")}
        >
          {data.featured.map((dataset) => {
            const s = processDatasetStats(dataset, locale);
            return card(dataset, [
              { type: "features", label: t("stats.features"), value: s.features },
              { type: "contributors", label: t("stats.contributors"), value: s.contributors },
              { type: "lastEdited", label: t("stats.lastEdited"), value: s.lastEdited },
            ]);
          })}
        </Section>
      )}

      {data.recentlyEdited.length > 0 && (
        <Section
          title={t("sections.recentlyEdited")}
          seeAllHref={seeAllHrefs?.recentlyEdited}
          seeAllLabel={t("seeAll")}
        >
          {data.recentlyEdited.map((dataset) =>
            card(dataset, [
              {
                type: "lastEdited",
                label: t("stats.lastEdited"),
                value: formatRelativeTime(dataset.lastEditedAt, locale),
              },
            ])
          )}
        </Section>
      )}

      {data.mostSaved.length > 0 && (
        <Section
          title={t("sections.mostSaved")}
          seeAllHref={seeAllHrefs?.mostSaved}
          seeAllLabel={t("seeAll")}
        >
          {data.mostSaved.map((dataset) =>
            card(dataset, [
              { type: "savedBy", label: t("stats.saves"), value: dataset._count.savedBy },
            ])
          )}
        </Section>
      )}

      {data.mostContributors.length > 0 && (
        <Section
          title={t("sections.mostContributors")}
          seeAllHref={seeAllHrefs?.mostContributors}
          seeAllLabel={t("seeAll")}
        >
          {data.mostContributors.map((dataset) =>
            card(dataset, [
              {
                type: "contributors",
                label: t("stats.contributors"),
                value: dataset.contributorsCount || 0,
              },
            ])
          )}
        </Section>
      )}

      {data.largest.length > 0 && (
        <Section
          title={t("sections.largest")}
          seeAllHref={seeAllHrefs?.largest}
          seeAllLabel={t("seeAll")}
        >
          {data.largest.map((dataset) =>
            card(dataset, [
              { type: "features", label: t("stats.features"), value: dataset.dataCount },
            ])
          )}
        </Section>
      )}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </section>
  );
}
