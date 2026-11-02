"use client";

import { useTranslations } from "next-intl";
import type { AreaTemplate } from "@/lib/area-templates";
import { areaBrowsePath } from "@/lib/template-topics";
import { CollapsingPicker } from "./collapsing-picker";
import { useTopics } from "./use-topics";

type TopicNavProps = {
  templates: AreaTemplate[];
  areaId: string;
  /** Unset on the hub. */
  activeTopicSlug?: string;
};

export function TopicNav({ templates, areaId, activeTopicSlug }: TopicNavProps) {
  const t = useTranslations("AreaPage");
  const topics = useTopics(templates);

  return (
    <div className="mt-2 lg:mt-4">
      <CollapsingPicker
        heading={t("pickTopic")}
        pickedHeading={t("pickedTopic")}
        headingId="pick-topic-heading"
        entries={topics.map((topic) => ({
          key: topic.slug,
          href: areaBrowsePath(areaId, topic.slug),
          label: topic.label,
          count: topic.count,
          isActive: topic.slug === activeTopicSlug,
        }))}
        clearHref={areaBrowsePath(areaId)}
      />
    </div>
  );
}
