import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";

export type AreaTemplate = {
  id: string;
  name: string;
  description: string | null;
  /** Leaf category slug the template belongs to. */
  category: string;
  /** Top-level (parent) category slug, or the leaf slug if it has no parent. */
  parentSlug: string;
  tags: string[];
};

/**
 * Fetch all active templates resolved for the given locale.
 * Shared by the area page and the area templates browse page.
 */
export async function getActiveTemplates(
  locale: string
): Promise<AreaTemplate[]> {
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
          parent: { select: { slug: true } },
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
    orderBy: { name: "asc" },
  });

  return rows.map((t) => {
    const categorySlug = t.category?.slug ?? "other";
    const parentSlug = t.category?.parent?.slug ?? categorySlug;
    const resolved = resolveTemplateForLocale(t, locale);
    return {
      id: resolved.id,
      name: resolved.name,
      description: resolved.description,
      category: categorySlug,
      parentSlug,
      tags: resolved.tags,
    };
  });
}

/**
 * Filter templates to those whose leaf category slug OR parent category slug
 * matches the given slug. Returns all templates when no slug is provided.
 */
export function filterTemplatesByCategory(
  templates: AreaTemplate[],
  categorySlug?: string
): AreaTemplate[] {
  if (!categorySlug) return templates;
  const matched = templates.filter(
    (t) => t.category === categorySlug || t.parentSlug === categorySlug
  );
  // Unknown slug -> show everything rather than an empty page.
  return matched.length > 0 ? matched : templates;
}

/**
 * Fetch the leaf categories that actually have active templates — the real,
 * non-overlapping set shown in the area "Find data in {area}" cards. (Synthetic
 * parent categories have no direct templates, so they fall out naturally.)
 */
export async function getCategories() {
  const categories = await prisma.category.findMany({
    where: { templates: { some: { isActive: true } } },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  // Case-insensitive, accent-aware alphabetical sort (DB sort is case-sensitive,
  // which misplaces capitalized names like "Services").
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}
