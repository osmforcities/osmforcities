import type { AreaTemplate } from "@/lib/area-templates";

type CategoryGroup = { categorySlug: string; templates: AreaTemplate[] };

export function listCommonTemplates(templates: AreaTemplate[]): AreaTemplate[] {
  return templates
    .filter((template) => template.commonRank !== null)
    .sort((a, b) => a.commonRank! - b.commonRank!);
}

export function countTemplatesByTopic(
  templates: AreaTemplate[]
): { topicSlug: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const { topicSlug } of templates) {
    counts.set(topicSlug, (counts.get(topicSlug) ?? 0) + 1);
  }
  return [...counts].map(([topicSlug, count]) => ({ topicSlug, count }));
}

/** Direct members of the topic form a group keyed by the topic's own slug. Keeps the given order. */
export function groupTopicByCategory(templates: AreaTemplate[], topicSlug: string): CategoryGroup[] {
  const groups = new Map<string, AreaTemplate[]>();
  for (const template of templates) {
    if (template.topicSlug !== topicSlug) continue;
    const group = groups.get(template.categorySlug) ?? [];
    group.push(template);
    groups.set(template.categorySlug, group);
  }
  return [...groups].map(([categorySlug, group]) => ({ categorySlug, templates: group }));
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
