import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import { getAreaDetailsById } from "@/lib/nominatim";

type AreaPageProps = {
  params: Promise<{
    areaId: string;
  }>;
};

export default async function AreaPage({ params }: AreaPageProps) {
  const { areaId } = await params;
  const t = await getTranslations("AreaPage");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const areaInfo = await getAreaDetailsById(osmRelationId);
  if (!areaInfo) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-olive-600 hover:text-olive-500 transition-colors"
        >
          {"← "}{t("backToHome")}
        </Link>
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
                {"ID: "}
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

          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">{t("comingSoon")}</p>
              <p className="text-xs text-gray-500">
                {t("comingSoonDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
