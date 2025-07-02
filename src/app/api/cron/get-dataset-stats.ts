import { prisma } from "@/lib/db";
import { DatasetStats } from "@/schemas/dataset";

export interface DatasetStat {
  id: string;
  name: string;
  cityName: string;
  areaName: string;
  dataCount: number;
  lastChanged: Date | null;
  lastChecked: Date | null;
  isPublic: boolean;
  stats: DatasetStats | null;
}

export interface DatasetStatsResult {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  datasetStats: DatasetStat[];
  publicDatasets: DatasetStat[];
  latestChange: DatasetStat | undefined;
  totalDatasets: number;
}

export async function getFirstUserAndDatasetStats(): Promise<DatasetStatsResult | null> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const firstUser = await prisma.user.findFirst({
    where: {
      OR: [{ lastNotified: null }, { lastNotified: { lt: oneDayAgo } }],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!firstUser) {
    return null; // No users need notification
  }

  const datasets = await prisma.dataset.findMany({
    include: {
      template: true,
      area: true,
      user: true,
    },
    where: {
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const datasetStats = datasets.map((dataset) => {
    const datasetWithStats = dataset as typeof dataset & {
      stats: DatasetStats | null;
    };
    const stats = datasetWithStats.stats;
    const lastChanged = stats?.mostRecentElement
      ? new Date(stats.mostRecentElement)
      : null;

    return {
      id: dataset.id,
      name: dataset.template.name,
      cityName: dataset.cityName,
      areaName: dataset.area.name,
      dataCount: dataset.dataCount,
      lastChanged,
      lastChecked: dataset.lastChecked,
      isPublic: dataset.isPublic,
      stats: stats,
    };
  });

  const publicDatasets = datasetStats.filter((ds) => ds.isPublic);

  const latestChange = datasetStats
    .filter((ds) => ds.lastChanged instanceof Date)
    .sort((a, b) => {
      const aTime = a.lastChanged?.getTime() || 0;
      const bTime = b.lastChanged?.getTime() || 0;
      return bTime - aTime;
    })[0];

  return {
    user: firstUser,
    datasetStats,
    publicDatasets,
    latestChange,
    totalDatasets: datasetStats.length,
  };
}
