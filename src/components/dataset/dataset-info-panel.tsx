"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

type DatasetInfoPanelProps = {
  dataset: Dataset;
  areaName: string;
};

export function DatasetInfoPanel({ dataset, areaName }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetPage");
  const { name, description } = dataset.template;
  // Most templates still repeat the name as description
  const showDescription = description && description !== name;

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
      {showDescription && (
        <p
          className="mt-1 text-sm text-gray-600"
          data-testid="dataset-template-description"
        >
          {description}
        </p>
      )}
    </>
  );
}
