"use client";

import { useTranslations } from "next-intl";
import type { AreaDataType } from "@/lib/area-templates";
import { groupTopicByCategory } from "@/lib/template-topics";
import { TemplateCard } from "./template-card";
import { useCategoryGroupLabel } from "./use-topics";

type TopicGroupsProps = {
  templates: AreaDataType[];
  topicSlug: string;
  areaId: string;
};

export function TopicGroups({ templates, topicSlug, areaId }: TopicGroupsProps) {
  const t = useTranslations("AreaPage");
  const groupLabel = useCategoryGroupLabel(topicSlug);
  const groups = groupTopicByCategory(templates, topicSlug);

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label={t("jumpToCategory")} className="flex flex-wrap gap-2 lg:hidden">
        {groups.map(({ categorySlug }) => (
          <a
            key={categorySlug}
            href={`#${categorySlug}`}
            className="inline-flex min-h-11 items-center rounded-full bg-olive-100 px-3.5 text-sm font-medium text-olive-800 hover:bg-olive-200"
          >
            {groupLabel(categorySlug)}
          </a>
        ))}
      </nav>
      {groups.map(({ categorySlug, templates: groupTemplates }) => (
        <section
          key={categorySlug}
          id={categorySlug}
          aria-labelledby={`${categorySlug}-heading`}
          className="flex scroll-mt-[calc(var(--nav-height)+1rem)] flex-col gap-3"
        >
          <h2 id={`${categorySlug}-heading`} className="text-base font-semibold text-gray-900">
            {groupLabel(categorySlug)}
            <span className="ml-1.5 font-normal text-gray-500">{groupTemplates.length}</span>
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {groupTemplates.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} areaId={areaId} phoneLayout="row" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
