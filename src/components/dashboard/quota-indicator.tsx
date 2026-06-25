"use client";

import {
  ProgressBar,
  Button,
  TooltipTrigger,
  Tooltip,
} from "react-aria-components";
import { useTranslations } from "next-intl";

type QuotaIndicatorProps = {
  used: number;
  limit: number;
};

export function QuotaIndicator({ used, limit }: QuotaIndicatorProps) {
  const t = useTranslations("TabLayout");

  const ratio = limit > 0 ? used / limit : 0;
  const isAtLimit = used >= limit;
  const isNearLimit = !isAtLimit && ratio >= 0.8;

  const fillColor = isAtLimit
    ? "bg-red-500"
    : isNearLimit
      ? "bg-amber-500"
      : "bg-gray-400";
  const labelColor = isAtLimit
    ? "text-red-700 dark:text-red-400"
    : isNearLimit
      ? "text-amber-700 dark:text-amber-500"
      : "text-gray-500 dark:text-gray-400";
  const iconColor = isAtLimit
    ? "text-red-400 hover:text-red-600 dark:hover:text-red-300"
    : isNearLimit
      ? "text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300";

  const pct = Math.min(100, ratio * 100);

  return (
    <div
      className="flex items-center gap-3"
      data-testid="dashboard-dataset-count"
    >
      <ProgressBar
        value={used}
        maxValue={limit}
        aria-valuetext={t("saveCountAriaLabel", { used, limit })}
        className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </ProgressBar>

      <span className={`text-sm font-medium ${labelColor}`}>
        {t("savedLabel", { used, limit })}
        {isAtLimit && (
          <span className="ml-1">{t("limitReachedSuffix")}</span>
        )}
      </span>

      <TooltipTrigger>
        <Button
          aria-label={t("quotaInfoButtonLabel")}
          className={`inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500 ${iconColor}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </Button>
        <Tooltip className="max-w-xs rounded-md bg-gray-900 dark:bg-gray-100 px-3 py-2 text-xs text-white dark:text-gray-900 shadow-lg">
          {t("quotaInfoTooltip", { limit })}
        </Tooltip>
      </TooltipTrigger>
    </div>
  );
}
