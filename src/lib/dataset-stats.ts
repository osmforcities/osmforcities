import { Dataset } from "@prisma/client";
import type { StatType } from "@/components/ui/dataset-card";

export interface ProcessedDatasetStats {
  features: number;
  contributors: number;
  lastEdited: string;
}

export interface DatasetStats {
  type: StatType;
  label: string;
  value: string | number;
}

export function getDatasetStats(
  dataset: {
    _count: { watchers: number };
    contributorsCount?: number | null;
    recentlyEditedCount?: number | null;
    lastEditedAt?: Date | null;
  },
  processedStats: ProcessedDatasetStats,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  section: "featured" | "largest" | "most-watched" | "most-contributors" | "recently-edited" | "default"
): DatasetStats[] {
  switch (section) {
    case "largest":
      return [
        { type: "features" as const, label: t("stats.features"), value: processedStats.features },
      ];
    case "most-watched":
      return [
        { type: "watchers" as const, label: t("stats.watchers"), value: dataset._count.watchers },
      ];
    case "most-contributors":
      return [
        { type: "contributors" as const, label: t("stats.contributors"), value: dataset.contributorsCount || 0 },
      ];
    case "recently-edited":
      return [
        { type: "features" as const, label: "Recently edited", value: dataset.recentlyEditedCount || 0 },
      ];
    default:
      return [
        { type: "features" as const, label: t("stats.features"), value: processedStats.features },
        { type: "contributors" as const, label: t("stats.contributors"), value: processedStats.contributors },
        { type: "lastEdited" as const, label: t("stats.lastEdited"), value: processedStats.lastEdited },
      ];
  }
}

export function processDatasetStats(dataset: Pick<Dataset, 'dataCount' | 'stats'>, locale: string): ProcessedDatasetStats {
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

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffMs / 86400000), "day");
  if (absSec < 31536000) return rtf.format(Math.round(diffMs / 2592000000), "month");
  return rtf.format(Math.round(diffMs / 31536000000), "year");
}
