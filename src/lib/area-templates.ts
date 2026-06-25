import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { mapAppLocaleToDb, resolveTemplateForLocale } from "@/lib/template-locale";

export type AreaTemplate = {
  id: string;
  name: string;
  description: string | null;
  /** Leaf category slug — used for filtering and URL `?category=` matching. */
  category: string;
  /** Human-readable category name — used for display. */
  categoryLabel: string;
  tags: string[];
};

export type AreaDataTypeStatus = {
  dataCount: number;
  contributors: number;
  lastEditedAt: string | null;
  savedCount: number;
  isFeatured: boolean;
};

export type CreatedDatasetStatus = AreaDataTypeStatus & { templateId: string };

export type AreaDataType = AreaTemplate & { status?: AreaDataTypeStatus };

/**
 * Merge data types (templates) with the area's created-dataset status and apply
 * the default order: featured -> saved -> other-created (each by dataCount desc),
 * then uncreated alphabetically.
 */
export function buildAreaDataTypes(
  templates: AreaTemplate[],
  datasets: CreatedDatasetStatus[]
): AreaDataType[] {
  const byTemplate = new Map(datasets.map((d) => [d.templateId, d]));

  const rows: AreaDataType[] = templates.map((tpl) => {
    const found = byTemplate.get(tpl.id);
    if (!found) return { ...tpl };
    const status: AreaDataTypeStatus = {
      dataCount: found.dataCount,
      contributors: found.contributors,
      lastEditedAt: found.lastEditedAt,
      savedCount: found.savedCount,
      isFeatured: found.isFeatured,
    };
    return { ...tpl, status };
  });

  const band = (r: AreaDataType): number => {
    if (!r.status) return 3;
    if (r.status.isFeatured) return 0;
    if (r.status.savedCount > 0) return 1;
    return 2;
  };

  return rows.sort((a, b) => {
    const ba = band(a);
    const bb = band(b);
    if (ba !== bb) return ba - bb;
    if (ba < 3) {
      const byCount = b.status!.dataCount - a.status!.dataCount;
      if (byCount !== 0) return byCount;
    }
    return a.name.localeCompare(b.name);
  });
}

type DatasetStatsShape =
  | { editorsCount?: number; mostRecentElement?: string | null }
  | null;

/**
 * Fetch the created datasets for an area as status records keyed by templateId.
 */
export async function getAreaCreatedDatasets(
  areaId: number
): Promise<CreatedDatasetStatus[]> {
  const rows = await prisma.dataset.findMany({
    where: { areaId, dataCount: { gt: 0 } },
    select: {
      templateId: true,
      dataCount: true,
      isFeatured: true,
      contributorsCount: true,
      lastEditedAt: true,
      stats: true,
      _count: { select: { savedBy: true } },
    },
  });

  return rows.map((r) => {
    const stats = r.stats as DatasetStatsShape;
    return {
      templateId: r.templateId,
      dataCount: r.dataCount,
      contributors: r.contributorsCount ?? stats?.editorsCount ?? 0,
      lastEditedAt: r.lastEditedAt
        ? r.lastEditedAt.toISOString()
        : stats?.mostRecentElement ?? null,
      savedCount: r._count.savedBy,
      isFeatured: r.isFeatured,
    };
  });
}

/**
 * All active data types for an area, each carrying its dataset status when one
 * exists, ordered so created/featured/saved data surfaces first.
 */
export async function getAreaDataTypes(
  areaId: number,
  locale: string
): Promise<AreaDataType[]> {
  const [templates, datasets] = await Promise.all([
    getActiveTemplates(locale),
    getAreaCreatedDatasets(areaId),
  ]);
  return buildAreaDataTypes(templates, datasets);
}

async function fetchActiveTemplates(locale: string): Promise<AreaTemplate[]> {
  const dbLocale = mapAppLocaleToDb(locale);
  const rows = await prisma.template.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      // Only fetch the translation for the requested locale — resolveTemplateForLocale
      // picks the matching row (now the only one) and falls back to the base fields.
      translations: {
        where: { locale: dbLocale },
        select: {
          locale: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((t) => {
    const resolved = resolveTemplateForLocale(t, locale);
    return {
      id: resolved.id,
      name: resolved.name,
      description: resolved.description,
      category: t.category?.slug ?? "other",
      categoryLabel: t.category?.name ?? "other",
      tags: resolved.tags,
    };
  });
}

/**
 * All active templates resolved for the given locale. Shared by the area page
 * and the area templates browse page.
 *
 * Area-independent and varies only by locale (the cache key), so the result is
 * cached instead of re-querying all active templates per load. Revalidates
 * hourly; bust the "templates" tag to refresh sooner.
 */
export const getActiveTemplates = unstable_cache(
  fetchActiveTemplates,
  ["active-templates"],
  { revalidate: 3600, tags: ["templates"] }
);
