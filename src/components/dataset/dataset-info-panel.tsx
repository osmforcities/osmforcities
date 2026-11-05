"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetPage");
  const { name, description } = dataset.template;
  // Most templates still repeat the name as description
  const showDescription = description && description !== name;

  return (
    // The area name is carried by the back link above and the category chip
    // sits on that same breadcrumb row (see dataset-interactive-section).
    <>
      <h2
        className="text-2xl font-semibold leading-tight"
        data-testid="dataset-template-name"
      >
        {t("datasetTitle", {
          template: name,
        })}
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
