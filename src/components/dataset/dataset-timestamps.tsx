"use client";

import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Pencil, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { formatRelativeTime } from "@/lib/dataset-stats";

type DatasetTimestampsProps = {
  dataset: Dataset;
  lastChecked?: Date | string | null;
};

type Timestamp = Date | string | null | undefined;

type PillTimes = {
  value: string;
  relative: string | null;
  exact: string | null;
};

const PILL_CLASS =
  "inline-flex flex-none items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600";

function toDate(timestamp: Timestamp): Date | null {
  if (!timestamp) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
}

function formatExactDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPillTimes(source: Timestamp, locale: string): PillTimes {
  const date = toDate(source);
  return {
    value: formatRelativeTime(source, locale, "narrow"),
    relative: date ? formatRelativeTime(source, locale, "long") : null,
    exact: date ? formatExactDate(date, locale) : null,
  };
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
      note: null,
    },
    {
      icon: RefreshCw,
      label: t("lastCheckedLabel"),
      source: lastChecked,
      note: t("fetchCadence"),
    },
  ];

  return (
    <>
      {rows.map(({ icon, label, source, note }) => (
        <TimestampPill
          key={label}
          icon={icon}
          label={label}
          note={note}
          {...formatPillTimes(source, locale)}
        />
      ))}
    </>
  );
}

function TimestampPill({
  icon: Icon,
  label,
  value,
  relative,
  exact,
  note,
}: PillTimes & {
  icon: LucideIcon;
  label: string;
  note?: string | null;
}) {
  const content = (
    <>
      <Icon className="size-3 flex-shrink-0 text-gray-400" aria-hidden />
      <span className="font-medium text-gray-700">{value}</span>
    </>
  );

  if (!relative) {
    return (
      <span aria-label={label} className={PILL_CLASS}>
        {content}
      </span>
    );
  }

  const description = `${label} ${relative}`;

  return (
    <DialogTrigger>
      <Button
        aria-label={description}
        className={`${PILL_CLASS} cursor-pointer hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500`}
      >
        {content}
      </Button>
      <Popover offset={6} className="outline-none">
        <Dialog
          aria-label={label}
          className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg outline-none"
        >
          <p className="font-medium">{description}</p>
          {exact ? <p className="mt-0.5 text-gray-300">{exact}</p> : null}
          {note ? (
            <p className="mt-1.5 max-w-52 border-t border-white/15 pt-1.5 text-gray-400">
              {note}
            </p>
          ) : null}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
