"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Pencil, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetTimestampsProps = {
  dataset: Dataset;
  lastChecked?: Date | string | null;
};

// Provenance timestamps shown in the title area as dataset freshness metadata.
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
    <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      {rows.map(({ icon: Icon, label, tip, value }) => (
        <div key={label} title={tip} className="inline-flex items-center gap-1">
          <Icon className="size-3.5 flex-shrink-0 text-gray-400" aria-hidden />
          <dt>{label}</dt>
          <dd className="font-medium text-gray-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
