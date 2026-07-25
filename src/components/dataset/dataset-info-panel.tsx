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
          className="text-2xl font-semibold leading-tight"
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

        {/* Place + category share one metadata line. Place links to the area's
            datasets; the category is a facet chip (drop-in link to a category
            filter later keeps the same chip idiom). Wraps within the sidebar. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/area/${dataset.area.id}`}
            className="inline-flex items-start gap-1 text-base text-gray-600 hover:text-gray-900 hover:underline transition-colors"
          >
            <MapPin className="size-4 flex-shrink-0 mt-0.5" aria-hidden />
            <span>{dataset.area.name}</span>
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-olive-50 text-olive-700 border border-olive-100">
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}
