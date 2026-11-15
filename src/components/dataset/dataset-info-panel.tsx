"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { shownDescription } from "@/lib/template-locale";
import { TemplateDescription } from "@/components/dataset/template-summary";

type DatasetInfoPanelProps = {
  dataset: Dataset;
  areaName: string;
};

export function DatasetInfoPanel({ dataset, areaName }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetPage");
  const { name } = dataset.template;

  return (
    // The title names the area: the back link above only says "Back", and the
    // no-map screens this page follows use the same "{dataset} in {area}".
    <>
      <h2
        className="text-2xl font-semibold leading-tight"
        data-testid="dataset-template-name"
      >
        {t("datasetInArea", { dataset: name, area: areaName })}
        {/* Short sr-only text: the full tooltip sentence would pollute the
            heading's accessible name */}
        {dataset.isFeatured && (
          <span
            className="ml-2 inline-flex align-baseline text-amber-500"
            title={t("featuredTooltip")}
          >
            <Star aria-hidden className="h-5 w-5 fill-current" />
            <span className="sr-only">{t("featured")}</span>
          </span>
        )}
      </h2>
      <TemplateDescription
        description={shownDescription(dataset.template)}
      />
    </>
  );
}
