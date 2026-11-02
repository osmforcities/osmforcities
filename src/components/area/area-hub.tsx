"use client";

import { useTranslations } from "next-intl";
import type { AreaDataType } from "@/lib/area-templates";
import { listCommonTemplates } from "@/lib/template-topics";
import { TemplateCard } from "./template-card";
import { TopicNav } from "./topic-nav";

type AreaHubProps = {
  templates: AreaDataType[];
  areaId: string;
};

export function AreaHub({ templates, areaId }: AreaHubProps) {
  const t = useTranslations("AreaPage");
  const commonTemplates = listCommonTemplates(templates);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t("commonDatasets")}
        </h2>
        <ul
          className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4"
          data-testid="common-templates"
        >
          {commonTemplates.map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} areaId={areaId} />
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2 lg:hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t("topics")}
        </h2>
        <TopicNav templates={templates} areaId={areaId} variant="rows" />
      </section>
    </div>
  );
}
