import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { mapAppLocaleToDb, resolveTemplateForLocale } from "@/lib/template-locale";
import { readStats } from "@/lib/dataset-stats";

export type AreaTemplate = {
  id: string;
  name: string;
  description: string | null;
  /** Labels resolve client-side from the CategoryLabel messages. */
  categorySlug: string;
  /** Top-level category; equals categorySlug for a topic's direct members. */
  topicSlug: string;
  tags: string[];
};

export type TopicCount = { topicSlug: string; count: number };

export type CategoryGroup<T extends AreaTemplate> = {
  categorySlug: string;
  templates: T[];
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

export function countTemplatesByTopic(templates: AreaTemplate[]): TopicCount[] {
  const counts = new Map<string, number>();
  for (const { topicSlug } of templates) {
    counts.set(topicSlug, (counts.get(topicSlug) ?? 0) + 1);
  }
  return [...counts]
    .map(([topicSlug, count]) => ({ topicSlug, count }))
    .sort((a, b) => a.topicSlug.localeCompare(b.topicSlug));
}

/**
 * A topic's templates grouped by child category (by slug), names A to Z inside
 * each group. Direct members of the topic come last as their own group.
 */
export function groupTopicByCategory<T extends AreaTemplate>(
  templates: T[],
  topicSlug: string
): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const template of templates) {
    if (template.topicSlug !== topicSlug) continue;
    const group = groups.get(template.categorySlug) ?? [];
    group.push(template);
    groups.set(template.categorySlug, group);
  }
  const isDirect = (slug: string) => slug === topicSlug;
  return [...groups]
    .sort(
      ([a], [b]) => Number(isDirect(a)) - Number(isDirect(b)) || a.localeCompare(b)
    )
    .map(([categorySlug, group]) => ({
      categorySlug,
      templates: group.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

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
    const stats = readStats(r);
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
    // Hide soft-deprecated templates: isActive stays true during the 30-day
    // window so existing dataset pages keep rendering, but a template that can
    // no longer be opened should not appear as available to browse/create.
    where: { isActive: true, deprecatesAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
      category: {
        select: { slug: true, parent: { select: { slug: true } } },
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
      categorySlug: t.category.slug,
      topicSlug: t.category.parent?.slug ?? t.category.slug,
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
