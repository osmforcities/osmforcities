import { Dataset } from "@prisma/client";
import type { StoredDatasetStats } from "@/lib/dataset-snapshot";

export interface ProcessedDatasetStats {
  features: number;
  contributors: number;
  lastEdited: string;
}

/**
 * The one sanctioned reader of the Dataset.stats JSON column. Deliberately a
 * cast, not a zod parse: legacy blobs missing newer fields must still be
 * served, so every StoredDatasetStats field is optional. Returns null for
 * null/scalar/array values.
 */
export function readStats(dataset: { stats: unknown }): StoredDatasetStats | null {
  const s = dataset.stats;
  return s && typeof s === "object" && !Array.isArray(s)
    ? (s as StoredDatasetStats)
    : null;
}

export function processDatasetStats(dataset: Pick<Dataset, 'dataCount' | 'stats'>, locale: string): ProcessedDatasetStats {
  const stats = readStats(dataset);

  return {
    features: dataset.dataCount,
    contributors: stats?.editorsCount || 0,
    lastEdited: formatRelativeTime(stats?.mostRecentElement, locale),
  };
}

/**
 * Format number in compact notation (1.2k, 2M, etc.)
 */
export function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value;
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function formatRelativeTime(
  timestamp: string | Date | null | undefined,
  locale: string,
  style: "long" | "short" | "narrow" = "long"
): string {
  if (!timestamp) return "—";

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffMs / 86400000), "day");
  if (absSec < 31536000) return rtf.format(Math.round(diffMs / 2592000000), "month");
  return rtf.format(Math.round(diffMs / 31536000000), "year");
}
