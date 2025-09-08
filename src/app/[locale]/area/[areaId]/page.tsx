import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { getAreaDetailsById } from "@/lib/nominatim";
import { prisma } from "@/lib/db";
import { DatasetGrid } from "@/components/ui/template-grid";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

type AreaPageProps = {
  params: Promise<{
    areaId: string;
  }>;
};

async function getActiveTemplates() {
  return await prisma.template.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { areaId } = await params;
  const t = await getTranslations("AreaPage");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, templates] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getActiveTemplates(),
  ]);

  if (!areaInfo) {
    notFound();
  }

  const breadcrumbItems = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.name },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>

        {/* Area Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {areaInfo.name}
              </h1>
              <p className="text-lg text-gray-600 mb-2">
                {areaInfo.state && areaInfo.country
                  ? `${areaInfo.state}, ${areaInfo.country}`
                  : areaInfo.state || areaInfo.country || ""}
              </p>
              <p className="text-sm text-gray-500">
                {t("idLabel")}
                {areaInfo.id}
              </p>
            </div>

            <a
              href={`https://www.openstreetmap.org/relation/${areaInfo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors font-medium shadow-sm"
            >
              <ExternalLink size={18} />
              {t("viewOnOpenStreetMap")}
            </a>
          </div>
        </div>

        {/* Datasets Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <DatasetGrid templates={templates} areaId={areaId} />
        </div>
      </div>
    </div>
  );
}
