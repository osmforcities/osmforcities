"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AreaDataType } from "@/lib/area-templates";
import { listCommonTemplates } from "@/lib/template-topics";
import { TemplateCard } from "./template-card";
import { TemplateItem } from "./template-item";
import { useTopics } from "./use-topics";

const TOPIC_ROW_LENGTH = 5;

type AreaHubProps = {
  templates: AreaDataType[];
  areaId: string;
};

export function AreaHub({ templates, areaId }: AreaHubProps) {
  const t = useTranslations("AreaPage");
  const topics = useTopics(templates);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t("commonDatasets")}
        </h2>
        <ul
          className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4"
          data-testid="common-templates"
        >
          {listCommonTemplates(templates).map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} areaId={areaId} />
            </li>
          ))}
        </ul>
      </section>
      {topics.map((topic) => {
        const topicPath = `/area/${areaId}/topics/${topic.slug}`;
        // Templates arrive ordered with data in this area first, then A to Z
        const rowTemplates = templates
          .filter((template) => template.topicSlug === topic.slug)
          .slice(0, TOPIC_ROW_LENGTH);
        return (
          <section key={topic.slug} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                <Link href={topicPath} className="hover:text-olive-700">
                  {topic.label}
                </Link>
                <span className="ml-1.5 font-normal text-gray-500">{topic.count}</span>
              </h2>
              <Link
                href={topicPath}
                aria-label={t("seeAllInTopic", { topic: topic.label })}
                className="inline-flex min-h-11 items-center text-sm font-medium text-olive-700 hover:text-olive-900 sm:min-h-0"
              >
                {t("seeAll")}
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {rowTemplates.map((template) => (
                <li key={template.id}>
                  <TemplateItem template={template} areaId={areaId} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
