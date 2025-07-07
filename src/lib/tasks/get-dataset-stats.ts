import { prisma } from "@/lib/db";

export interface DatasetStats {
  user: {
    id: string;
    email: string;
    reportsFrequency: "DAILY" | "WEEKLY";
  };
  totalDatasets: number;
  publicDatasets: Array<{
    id: string;
    name: string;
    description: string | null;
    lastChecked: Date | null;
    lastChanged: Date | null;
  }>;
  latestChange: {
    lastChanged: Date;
  } | null;
}

export async function getFirstUserAndDatasetStats(): Promise<DatasetStats | null> {
  const user = await prisma.user.findFirst({
    where: {
      reportsEnabled: true,
      OR: [
        { lastReportSent: null },
        {
          AND: [
            { reportsFrequency: "DAILY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
              },
            },
          ],
        },
        {
          AND: [
            { reportsFrequency: "WEEKLY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      reportsFrequency: true,
    },
  });

  if (!user) {
    return null;
  }

  const totalDatasets = await prisma.dataset.count({
    where: { userId: user.id },
  });

  const publicDatasets = await prisma.dataset.findMany({
    where: { userId: user.id, isPublic: true },
    select: {
      id: true,
      cityName: true,
      lastChecked: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const latestChange = await prisma.dataset.findFirst({
    where: { userId: user.id },
    select: { updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      reportsFrequency: user.reportsFrequency,
    },
    totalDatasets,
    publicDatasets: publicDatasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.cityName,
      description: null,
      lastChecked: dataset.lastChecked,
      lastChanged: dataset.updatedAt,
    })),
    latestChange: latestChange ? { lastChanged: latestChange.updatedAt } : null,
  };
}
