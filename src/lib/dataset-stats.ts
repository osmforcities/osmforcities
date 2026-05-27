import { Dataset } from "@prisma/client";

export interface ProcessedDatasetStats {
  features: number;
  contributors: number;
  lastEdited: string;
}

export function processDatasetStats(dataset: Dataset): ProcessedDatasetStats {
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
    lastEdited: formatRelativeTime(stats?.mostRecentElement),
  };
}

function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";

  const date = new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}
