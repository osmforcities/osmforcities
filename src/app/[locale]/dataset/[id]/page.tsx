import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getLocale } from "next-intl/server";
import { type Dataset } from "@/schemas/dataset";
import { transformDataset } from "@/lib/dataset/transform";
import { DatasetMapWrapper } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/dataset-actions-section";
import { DatasetLayout } from "@/components/dataset/dataset-layout";
import { trackEvent, getClientInfoFromHeaders } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getAreaBoundary } from "@/lib/area-boundary";

async function getDataset(id: string, locale: string): Promise<Dataset | null> {
  try {
    const session = await auth();
    const user = session?.user || null;

    const rawDataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            translations: true,
            category: {
              select: { slug: true },
            },
          },
        },
        area: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        watchers: user
          ? {
              where: { userId: user.id },
              select: { id: true, userId: true, createdAt: true },
            }
          : false,
        _count: {
          select: { watchers: true },
        },
      },
    });

    if (!rawDataset) return null;

    return transformDataset(rawDataset, user, locale);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return null;
  }
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const dataset = await getDataset(id, locale);

  if (!dataset) {
    return notFound();
  }

  const boundary = await getAreaBoundary(dataset.area.id);

  trackEvent(ANALYTICS_EVENTS.DATASET_DETAIL_VIEW, `/datasets/${id}/view`, await getClientInfoFromHeaders());

  return (
    <DatasetLayout
      infoPanel={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-6">
            <DatasetInfoPanel dataset={dataset} />
            <DatasetStatsTable dataset={dataset} />
          </div>
          <DatasetActionsSection dataset={dataset} />
        </div>
      }
      mapPanel={<DatasetMapWrapper dataset={dataset} boundary={boundary} />}
    />
  );
}
