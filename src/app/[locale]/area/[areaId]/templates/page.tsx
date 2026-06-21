import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAreaDetailsById } from "@/lib/nominatim";
import { getActiveTemplates } from "@/lib/area-templates";
import { DatasetGrid } from "@/components/ui/template-grid";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export const revalidate = 3600;

type AreaTemplatesPageProps = {
  params: Promise<{
    areaId: string;
  }>;
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function AreaTemplatesPage({
  params,
  searchParams,
}: AreaTemplatesPageProps) {
  const { areaId } = await params;
  const { category } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("AreaPage");
  const catT = await getTranslations("CategoryCards");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, templates] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getActiveTemplates(locale),
  ]);

  if (!areaInfo) {
    notFound();
  }

  const breadcrumbItems = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.country || "Area" },
    ...(areaInfo.state ? [{ label: areaInfo.state }] : []),
    { label: areaInfo.name, href: `/area/${areaId}` },
    { label: t("findData") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 lg:min-h-0 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex lg:flex-col lg:overflow-hidden">
      {/* Header (fixed on desktop) */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-8 pb-4 lg:flex-shrink-0">
        <div className="mb-6">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {catT("title", { area: areaInfo.name })}
        </h1>
        <p className="text-gray-600">{catT("subtitle")}</p>
      </div>

      {/* Browse area (fills remaining height on desktop) */}
      <div className="max-w-7xl w-full mx-auto px-6 pb-8 lg:pb-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <DatasetGrid
          templates={templates}
          areaId={areaId}
          initialCategory={category}
        />
      </div>
    </div>
  );
}
