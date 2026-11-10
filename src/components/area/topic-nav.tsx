"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AreaTemplate } from "@/lib/area-templates";
import { getCategoryIcon } from "@/lib/category-icons";
import { useCategoryLabel } from "@/lib/category-label";
import { areaBrowsePath, countTemplatesByTopic } from "@/lib/template-topics";
import { CollapsingPicker } from "./collapsing-picker";

type TopicNavProps = {
  templates: AreaTemplate[];
  areaId: string;
  /** Unset on the hub. */
  activeTopicSlug?: string;
};

export function TopicNav({ templates, areaId, activeTopicSlug }: TopicNavProps) {
  const t = useTranslations("AreaPage");
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();

  const entries = countTemplatesByTopic(templates)
    .map(({ topicSlug, count }) => ({
      key: topicSlug,
      href: areaBrowsePath(areaId, topicSlug),
      label: categoryLabel(topicSlug),
      icon: getCategoryIcon(topicSlug),
      count,
      isActive: topicSlug === activeTopicSlug,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <CollapsingPicker
      heading={t("pickTopic")}
      pickedHeading={t("pickedTopic")}
      entries={entries}
      clearHref={areaBrowsePath(areaId)}
    />
  );
}
