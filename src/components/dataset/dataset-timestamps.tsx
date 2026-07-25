"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Pencil, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetTimestampsProps = {
  dataset: Dataset;
  lastChecked?: Date | string | null;
};

// Provenance freshness metadata, rendered as neutral chips on the title-area
// chip row (alongside the category facet chip). Icons carry edited-vs-fetched;
// neutral styling keeps them distinct from the olive category facet.
export function DatasetTimestamps({
  dataset,
  lastChecked,
}: DatasetTimestampsProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();

  const rows = [
    {
      icon: Pencil,
      label: t("lastEdited"),
      tip: t("lastEditedTip"),
      value: formatRelativeTime(dataset.stats?.mostRecentElement, locale),
    },
    {
      icon: RefreshCw,
      label: t("lastCheckedLabel"),
      tip: t("lastCheckedTip"),
      value: formatRelativeTime(lastChecked, locale),
    },
  ];

  return (
    <>
      {rows.map(({ icon: Icon, label, tip, value }) => (
        <span
          key={label}
          title={tip}
          aria-label={`${label} ${value}`}
          className="inline-flex flex-none items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
        >
          <Icon className="size-3 flex-shrink-0 text-gray-400" aria-hidden />
          <span className="font-medium text-gray-700">{value}</span>
        </span>
      ))}
    </>
  );
}
