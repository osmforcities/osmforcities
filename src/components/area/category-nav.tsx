"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AreaTemplate } from "@/lib/area-templates";
import { useCategoryLabel } from "@/lib/category-label";
import { areaBrowsePath, groupTopicByCategory } from "@/lib/template-topics";
import { CollapsingPicker } from "./collapsing-picker";

type CategoryNavProps = {
  templates: AreaTemplate[];
  areaId: string;
  topicSlug: string;
  /** Unset when all of the topic's datasets are shown. */
  activeCategorySlug?: string;
};

export function CategoryNav({
  templates,
  areaId,
  topicSlug,
  activeCategorySlug,
}: CategoryNavProps) {
  const t = useTranslations("AreaPage");
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  const groups = groupTopicByCategory(templates, topicSlug);

  if (groups.length < 2) return null;

  const isOther = (categorySlug: string) => categorySlug === topicSlug;
  const entries = groups
    .map(({ categorySlug, templates: groupTemplates }) => ({
      key: categorySlug,
      href: areaBrowsePath(areaId, topicSlug, categorySlug),
      label: isOther(categorySlug) ? t("otherCategory") : categoryLabel(categorySlug),
      count: groupTemplates.length,
      isActive: categorySlug === activeCategorySlug,
    }))
    .sort(
      (a, b) =>
        Number(isOther(a.key)) - Number(isOther(b.key)) ||
        a.label.localeCompare(b.label, locale)
    );

  return (
    <CollapsingPicker
      heading={t("pickCategory")}
      pickedHeading={t("pickedCategory")}
      headingId="pick-category-heading"
      entries={entries}
      clearHref={areaBrowsePath(areaId, topicSlug)}
    />
  );
}
