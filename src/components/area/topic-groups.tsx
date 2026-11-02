"use client";

import { useTranslations } from "next-intl";
import type { AreaDataType } from "@/lib/area-templates";
import { groupTopicByCategory } from "@/lib/template-topics";
import { TemplateItem } from "./template-item";
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
    <div className="flex flex-col gap-6">
      <nav aria-label={t("jumpToCategory")}>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {groups.map(({ categorySlug }) => (
            <li key={categorySlug}>
              <a
                href={`#${categorySlug}`}
                className="inline-flex min-h-11 items-center font-medium text-olive-700 hover:text-olive-900 sm:min-h-8"
              >
                {groupLabel(categorySlug)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {groups.map(({ categorySlug, templates: groupTemplates }) => (
        <section
          key={categorySlug}
          id={categorySlug}
          aria-labelledby={`${categorySlug}-heading`}
          className="flex scroll-mt-[calc(var(--nav-height)+1rem)] flex-col gap-2.5"
        >
          <h2 id={`${categorySlug}-heading`} className="text-base font-semibold text-gray-900">
            {groupLabel(categorySlug)}
            <span className="ml-1.5 font-normal text-gray-500">{groupTemplates.length}</span>
          </h2>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {groupTemplates.map((template) => (
              <li key={template.id}>
                <TemplateItem template={template} areaId={areaId} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
