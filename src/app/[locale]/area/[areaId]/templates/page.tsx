import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAreaDetailsById } from "@/lib/nominatim";
import {
  getActiveTemplates,
  filterTemplatesByCategory,
} from "@/lib/area-templates";
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
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, allTemplates] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getActiveTemplates(locale),
  ]);

  if (!areaInfo) {
    notFound();
  }

  const templates = filterTemplatesByCategory(allTemplates, category);

  const breadcrumbItems = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.country || "Area" },
    ...(areaInfo.state ? [{ label: areaInfo.state }] : []),
    { label: areaInfo.name, href: `/area/${areaId}` },
    { label: t("availableDatasets") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <DatasetGrid templates={templates} areaId={areaId} />
        </div>
      </div>
    </div>
  );
}
