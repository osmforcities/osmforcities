import { Dataset } from "@prisma/client";

export interface ProcessedDatasetStats {
  features: number;
  contributors: number;
  lastEdited: string;
}

export function processDatasetStats(dataset: Dataset, locale: string): ProcessedDatasetStats {
  const stats = dataset.stats as
    | {
        editorsCount?: number;
        mostRecentElement?: string | null;
      }
    | undefined
    | null;

  return {
    features: dataset.dataCount,
    contributors: stats?.editorsCount || 0,
    lastEdited: formatRelativeTime(stats?.mostRecentElement, locale),
  };
}

function formatRelativeTime(timestamp: string | null | undefined, locale: string): string {
  if (!timestamp) return "—";

  const diffMs = new Date(timestamp).getTime() - Date.now();
  const absSec = Math.abs(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffMs / 86400000), "day");
  if (absSec < 31536000) return rtf.format(Math.round(diffMs / 2592000000), "month");
  return rtf.format(Math.round(diffMs / 31536000000), "year");
}
