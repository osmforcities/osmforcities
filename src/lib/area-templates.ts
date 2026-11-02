import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { mapAppLocaleToDb, resolveTemplateForLocale } from "@/lib/template-locale";

export type AreaTemplate = {
  id: string;
  name: string;
  description: string | null;
  /** Labels resolve client-side from the CategoryLabel messages. */
  categorySlug: string;
  /** Equals categorySlug for templates filed directly under a topic. */
  topicSlug: string;
  commonRank: number | null;
};

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
      commonRank: true,
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
  });

  return rows
    .map((t) => {
      const resolved = resolveTemplateForLocale(t, locale);
      return {
        id: resolved.id,
        name: resolved.name,
        description: resolved.description,
        categorySlug: t.category.slug,
        topicSlug: t.category.parent?.slug ?? t.category.slug,
        commonRank: t.commonRank,
      };
    })
    // Sorted after translation, so the order follows the reader's language
    .sort((a, b) => a.name.localeCompare(b.name, locale));
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
  ["active-templates-v2"],
  { revalidate: 3600, tags: ["templates"] }
);
