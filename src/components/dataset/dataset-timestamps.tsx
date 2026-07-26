"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Pencil, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetTimestampsProps = {
  dataset: Dataset;
  lastChecked?: Date | string | null;
};

const PILL_CLASS =
  "inline-flex flex-none items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600";

function isKnownDate(timestamp: Date | string | null | undefined): boolean {
  if (!timestamp) return false;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return !isNaN(date.getTime());
}

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
      source: dataset.stats?.mostRecentElement,
    },
    {
      icon: RefreshCw,
      label: t("lastCheckedLabel"),
      source: lastChecked,
    },
  ];

  return (
    <>
      {rows.map(({ icon, label, source }) => (
        <TimestampPill
          key={label}
          icon={icon}
          label={label}
          value={formatRelativeTime(source, locale, "narrow")}
          full={
            isKnownDate(source)
              ? formatRelativeTime(source, locale, "long")
              : null
          }
        />
      ))}
    </>
  );
}

// A known date reveals its full relative time (e.g. "Edited 2 days ago") via a
// focusable tooltip; without one the chip is static.
function TimestampPill({
  icon: Icon,
  label,
  value,
  full,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  full: string | null;
}) {
  const content = (
    <>
      <Icon className="size-3 flex-shrink-0 text-gray-400" aria-hidden />
      <span className="font-medium text-gray-700">{value}</span>
    </>
  );

  if (!full) {
    return (
      <span aria-label={label} className={PILL_CLASS}>
        {content}
      </span>
    );
  }

  const description = `${label} ${full}`;

  return (
    <TooltipTrigger delay={300}>
      <Button
        aria-label={description}
        className={`${PILL_CLASS} hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500`}
      >
        {content}
      </Button>
      <Tooltip
        offset={6}
        className="rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg"
      >
        {description}
      </Tooltip>
    </TooltipTrigger>
  );
}
