import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAreaDetailsById } from "@/lib/nominatim";
import { getAreaDataTypes } from "@/lib/area-templates";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Link } from "@/components/ui/link";
import { DatasetGrid } from "@/components/ui/template-grid";
import { trackEvent, getClientInfoFromHeaders } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { auth } from "@/auth";

export const revalidate = 3600;

type AreaPageProps = {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function AreaPage({ params, searchParams }: AreaPageProps) {
  const { areaId } = await params;
  const { category } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("AreaPage");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, dataTypes, session] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getAreaDataTypes(osmRelationId, locale),
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
    <div className="min-h-screen bg-gray-50 lg:min-h-0 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex lg:flex-col lg:overflow-hidden">
      {/* Header (fixed on desktop) */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-8 pb-4 lg:flex-shrink-0">
        <div className="mb-6">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{areaInfo.name}</h1>
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

      {/* Browse area (fills remaining height on desktop) */}
      <div className="max-w-7xl w-full mx-auto px-6 pb-8 lg:pb-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <DatasetGrid
          templates={dataTypes}
          areaId={areaId}
          initialCategory={category}
        />
      </div>
    </div>
  );
}
