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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <BreadcrumbNav items={breadcrumbItems} />
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-olive-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {areaInfo.name}
              </h1>
              <p className="text-sm text-gray-600 mb-2">
                {areaInfo.state && areaInfo.country
                  ? `${areaInfo.state}, ${areaInfo.country}`
                  : areaInfo.state || areaInfo.country || ""}
              </p>
              <p className="text-xs text-gray-400">
                {t("idLabel")}
                {areaInfo.id}
              </p>
            </div>

            <a
              href={`https://www.openstreetmap.org/relation/${areaInfo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors text-sm font-medium"
            >
              <ExternalLink size={16} />
              {t("viewOnOpenStreetMap")}
            </a>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <DatasetGrid templates={templates} areaId={areaId} />
      </div>
    </div>
  );
}
