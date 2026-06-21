import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAreaDetailsById } from "@/lib/nominatim";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/area-templates";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Link } from "@/components/ui/link";
import { trackEvent, getClientInfoFromHeaders } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { auth } from "@/auth";
import { DatasetSections } from "@/components/dataset/dataset-sections";
import { CategoryCards } from "@/components/ui/category-cards";

export const revalidate = 3600;

type AreaPageProps = {
  params: Promise<{
    areaId: string;
  }>;
};

const DATASET_SELECT = {
  id: true,
  cityName: true,
  dataCount: true,
  stats: true,
  areaId: true,
  templateId: true,
  createdAt: true,
  area: {
    select: {
      id: true,
      countryCode: true,
    },
  },
  template: {
    select: {
      id: true,
      name: true,
      description: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      translations: {
        select: {
          locale: true,
          name: true,
          description: true,
        },
      },
    },
  },
} as const;

async function getAreaDatasets(areaId: number) {
  const osmRelationId = areaId;

  const [featured, recentlyEdited, mostSaved, mostContributors, largest] = await Promise.all([
    // Featured datasets for this area
    prisma.dataset.findMany({
      where: {
        isFeatured: true,
        dataCount: { gt: 0 },
        areaId: osmRelationId,
      },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { savedBy: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Recently edited datasets for this area
    prisma.dataset.findMany({
      where: {
        isActive: true,
        dataCount: { gt: 0 },
        lastEditedAt: { not: null },
        areaId: osmRelationId,
      },
      select: {
        ...DATASET_SELECT,
        recentlyEditedCount: true,
        lastEditedAt: true,
        _count: {
          select: { savedBy: true },
        },
      },
      orderBy: { lastEditedAt: "desc" },
      take: 6,
    }),
    // Most saved datasets for this area
    prisma.dataset.findMany({
      where: {
        isActive: true,
        dataCount: { gt: 0 },
        savedBy: { some: {} },
        areaId: osmRelationId,
      },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { savedBy: true },
        },
      },
      orderBy: { savedBy: { _count: "desc" } },
      take: 6,
    }),
    // Datasets with most contributors for this area
    prisma.dataset.findMany({
      where: {
        isActive: true,
        dataCount: { gt: 0 },
        contributorsCount: { not: null },
        areaId: osmRelationId,
      },
      select: {
        ...DATASET_SELECT,
        contributorsCount: true,
        _count: {
          select: { savedBy: true },
        },
      },
      orderBy: { contributorsCount: "desc" },
      take: 6,
    }),
    // Largest datasets for this area
    prisma.dataset.findMany({
      where: {
        isActive: true,
        dataCount: { gt: 0 },
        areaId: osmRelationId,
      },
      select: {
        ...DATASET_SELECT,
        _count: {
          select: { savedBy: true },
        },
      },
      orderBy: { dataCount: "desc" },
      take: 6,
    }),
  ]);

  return { featured, recentlyEdited, mostSaved, mostContributors, largest };
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { areaId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("AreaPage");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, datasets, categories, session] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getAreaDatasets(osmRelationId),
    getCategories(),
    auth(),
  ]);

  if (!areaInfo) {
    notFound();
  }

  trackEvent(
    session?.user
      ? ANALYTICS_EVENTS.AREA_VIEW_LOGGED_IN
      : ANALYTICS_EVENTS.AREA_VIEW_LOGGED_OUT,
    `/area/${areaId}/view`,
    await getClientInfoFromHeaders()
  );

  const breadcrumbItems = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.country || "Area" },
    ...(areaInfo.state ? [{ label: areaInfo.state }] : []),
    { label: areaInfo.name },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>

        {/* Area Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {areaInfo.name}
          </h1>
          <p className="text-lg text-gray-600 mb-1">
            {areaInfo.state && areaInfo.country
              ? `${areaInfo.state}, ${areaInfo.country}`
              : areaInfo.state || areaInfo.country || ""}
          </p>
          <Link
            href={`https://www.openstreetmap.org/relation/${areaInfo.id}`}
            external
            size="sm"
          >
            {t("idLabel")}
            {areaInfo.id}
          </Link>
        </div>

        <DatasetSections data={datasets} locale={locale} />

        {/* Find data by category */}
        <CategoryCards
          categories={categories}
          areaId={areaId}
          areaName={areaInfo.name}
        />
      </div>
    </div>
  );
}
