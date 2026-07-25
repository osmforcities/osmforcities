"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Clock, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetTimestampsProps = {
  dataset: Dataset;
  lastChecked?: Date | string | null;
};

// Status timestamps pinned to the panel footer (above the action buttons).
export function DatasetTimestamps({
  dataset,
  lastChecked,
}: DatasetTimestampsProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();

  const rows = [
    {
      icon: Clock,
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
    <dl className="space-y-1.5 text-xs text-gray-500">
      {rows.map(({ icon: Icon, label, tip, value }) => (
        <div key={label} title={tip} className="flex items-center gap-1.5">
          <Icon className="size-3.5 flex-shrink-0" aria-hidden />
          <dt>{label}</dt>
          <dd className="font-medium text-gray-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
