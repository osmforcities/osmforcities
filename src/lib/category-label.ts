import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toSentenceCase, type MessageResolver } from "@/lib/tag-i18n";

/**
 * Category label by slug from the CategoryLabel messages. A slug without a
 * message ("roads-streets") falls back to sentence case ("Roads streets").
 */
export function categoryLabel(t: MessageResolver, slug: string): string {
  return t.has(slug) ? t(slug) : toSentenceCase(slug.replace(/-/g, " "));
}

/** Stable across renders, so it is safe in memo and effect deps. */
export function useCategoryLabel(): (slug: string) => string {
  // Slugs come from templates.yml, not a literal key union
  const t = useTranslations("CategoryLabel") as unknown as MessageResolver;
  return useCallback((slug: string) => categoryLabel(t, slug), [t]);
}
