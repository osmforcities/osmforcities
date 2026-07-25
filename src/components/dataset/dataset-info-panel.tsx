"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";
import { Star, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetPage");
  const category = dataset.template.category?.name ?? "other";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2
          className="text-xl font-semibold leading-tight"
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
              <Star aria-hidden className="h-4 w-4 fill-current" />
              <span className="sr-only">{t("featured")}</span>
            </span>
          )}
        </h2>

        {/* Area context (secondary to the title), links to the area's datasets */}
        <Link
          href={`/area/${dataset.area.id}`}
          className="inline-flex items-start gap-1 text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
        >
          <MapPin className="size-4 flex-shrink-0 mt-px" aria-hidden />
          <span>{dataset.area.name}</span>
        </Link>
      </div>

      {/* Category shown as a facet pill; drop-in link to a category filter later
          keeps the same chip idiom. */}
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        {category}
      </span>
    </div>
  );
}
