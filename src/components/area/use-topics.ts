"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AreaTemplate } from "@/lib/area-templates";
import { countTemplatesByTopic } from "@/lib/template-topics";
import { useCategoryLabel } from "@/lib/category-label";

export type TopicEntry = { slug: string; label: string; count: number };

export function useTopics(templates: AreaTemplate[]): TopicEntry[] {
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  return useMemo(
    () =>
      countTemplatesByTopic(templates)
        .map(({ topicSlug, count }) => ({
          slug: topicSlug,
          label: categoryLabel(topicSlug),
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [templates, categoryLabel, locale]
  );
}

/** A topic's direct members form a group keyed by the topic's own slug. */
export function useCategoryGroupLabel(topicSlug: string): (categorySlug: string) => string {
  const t = useTranslations("AreaPage");
  const categoryLabel = useCategoryLabel();
  return useCallback(
    (categorySlug: string) =>
      categorySlug === topicSlug ? t("otherCategory") : categoryLabel(categorySlug),
    [t, categoryLabel, topicSlug]
  );
}
