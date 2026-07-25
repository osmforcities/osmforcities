"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetPage");
  const category = dataset.template.category?.name ?? "other";

  return (
    // Title (left) + category facet chip pinned top-right. The chip stays on the
    // title's top edge (self-start) even when the heading wraps to two lines; the
    // area name is carried by the back link above. Drop-in link to a category
    // filter later keeps the same chip idiom.
    <div className="flex items-start gap-2">
      <h2
        className="min-w-0 flex-1 text-2xl font-semibold leading-tight"
        data-testid="dataset-template-name"
      >
        {t("datasetTitle", {
          template: dataset.template.name,
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

      <span className="mt-0.5 inline-flex flex-none items-center rounded-full border border-olive-100 bg-olive-50 px-2 py-0.5 text-xs font-semibold text-olive-700">
        {category}
      </span>
    </div>
  );
}
