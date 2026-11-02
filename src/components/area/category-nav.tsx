"use client";

import { useTranslations } from "next-intl";
import type { AreaTemplate } from "@/lib/area-templates";
import { areaBrowsePath, groupTopicByCategory } from "@/lib/template-topics";
import { CollapsingPicker } from "./collapsing-picker";
import { useCategoryGroupLabel } from "./use-topics";

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
  const groupLabel = useCategoryGroupLabel(topicSlug);
  const groups = groupTopicByCategory(templates, topicSlug);

  if (groups.length < 2) return null;

  return (
    <CollapsingPicker
      heading={t("pickCategory")}
      pickedHeading={t("pickedCategory")}
      headingId="pick-category-heading"
      entries={groups.map(({ categorySlug, templates: groupTemplates }) => ({
        key: categorySlug,
        href: areaBrowsePath(areaId, topicSlug, categorySlug),
        label: groupLabel(categorySlug),
        count: groupTemplates.length,
        isActive: categorySlug === activeCategorySlug,
      }))}
      clearHref={areaBrowsePath(areaId, topicSlug)}
    />
  );
}
