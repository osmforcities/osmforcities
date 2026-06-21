import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";

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
