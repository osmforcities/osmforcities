import type { AreaTemplate } from "@/lib/area-templates";

export type TopicCount = { topicSlug: string; count: number };

export type CategoryGroup<T extends AreaTemplate> = {
  categorySlug: string;
  templates: T[];
};

export function listCommonTemplates<T extends AreaTemplate>(templates: T[]): T[] {
  return templates
    .filter((template) => template.commonRank !== null)
    .sort((a, b) => a.commonRank! - b.commonRank!);
}

/** Sorted by slug for a stable order; the UI sorts by localized label. */
export function countTemplatesByTopic(templates: AreaTemplate[]): TopicCount[] {
  const counts = new Map<string, number>();
  for (const { topicSlug } of templates) {
    counts.set(topicSlug, (counts.get(topicSlug) ?? 0) + 1);
  }
  return [...counts]
    .map(([topicSlug, count]) => ({ topicSlug, count }))
    .sort((a, b) => a.topicSlug.localeCompare(b.topicSlug));
}

/** Direct members of the topic come last, as the "Other" group. Keeps the given template order. */
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
  const isDirect = (categorySlug: string) => categorySlug === topicSlug;
  return [...groups]
    .sort(([a], [b]) => Number(isDirect(a)) - Number(isDirect(b)) || a.localeCompare(b))
    .map(([categorySlug, group]) => ({
      categorySlug,
      templates: group,
    }));
}

export function findTopicOfCategory(
  templates: AreaTemplate[],
  categorySlug: string
): string | undefined {
  return templates.find(
    (template) =>
      template.categorySlug === categorySlug || template.topicSlug === categorySlug
  )?.topicSlug;
}

export function areaBrowsePath(areaId: string, topicSlug?: string, categorySlug?: string): string {
  const hubPath = `/area/${areaId}`;
  if (!topicSlug) return hubPath;
  const topicPath = `${hubPath}/topics/${topicSlug}`;
  return categorySlug ? `${topicPath}/${categorySlug}` : topicPath;
}

/** A legacy ?category= naming a topic itself opens the topic, not its "Other" group. */
export function categoryBrowsePath(
  areaId: string,
  templates: AreaTemplate[],
  categorySlug: string | undefined
): string {
  const topicSlug = categorySlug ? findTopicOfCategory(templates, categorySlug) : undefined;
  return areaBrowsePath(areaId, topicSlug, categorySlug === topicSlug ? undefined : categorySlug);
}
