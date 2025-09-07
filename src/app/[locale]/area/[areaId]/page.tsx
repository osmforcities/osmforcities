import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type AreaPageProps = {
  params: Promise<{
    areaId: string;
  }>;
};

async function getAreaInfo(osmRelationId: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=R${osmRelationId}&format=json&addressdetails=1&extratags=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "OSMForCities/1.0",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    return {
      id: osmRelationId,
      name: data[0].name || data[0].display_name.split(",")[0].trim(),
      displayName: data[0].display_name,
      osmType: "relation" as const,
      boundingBox: [
        parseFloat(data[0].boundingbox[0]),
        parseFloat(data[0].boundingbox[2]),
        parseFloat(data[0].boundingbox[1]),
        parseFloat(data[0].boundingbox[3]),
      ],
      countryCode: data[0].address?.country_code,
      adminLevel: data[0].extratags?.admin_level,
      population: data[0].extratags?.population,
    };
  } catch (error) {
    console.error("Error fetching area info:", error);
    return null;
  }
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { areaId } = await params;
  const t = await getTranslations("AreaPage");
  
  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const areaInfo = await getAreaInfo(osmRelationId);
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
          {t("backToHome")}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-olive-700 mb-2">
            {areaInfo.name}
          </h1>
          <p className="text-lg text-olive-600 mb-4">
            {areaInfo.displayName}
          </p>
          
          <div className="flex flex-wrap gap-4 text-sm text-olive-500">
            <span>
              {t("osmId")}{": "}{areaInfo.id}
            </span>
            {areaInfo.adminLevel && (
              <span>
                {t("adminLevel")}{": "}{areaInfo.adminLevel}
              </span>
            )}
            {areaInfo.population && (
              <span>
                {t("population")}{": "}{parseInt(areaInfo.population).toLocaleString()}
              </span>
            )}
            {areaInfo.countryCode && (
              <span>
                {t("country")}{": "}{areaInfo.countryCode.toUpperCase()}
              </span>
            )}
          </div>
        </header>

        <div className="bg-white rounded-lg border border-olive-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-olive-700 mb-4">
            {t("availableDatasets")}
          </h2>
          <div className="text-olive-600">
            <p>{t("comingSoon")}</p>
            <p className="text-sm mt-2">{t("comingSoonDescription")}</p>
          </div>
        </div>

        <div className="bg-olive-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-olive-700 mb-3">
            {t("areaDetails")}
          </h3>
          
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-olive-600">{t("boundingBox")}</dt>
              <dd className="text-olive-500 font-mono">
                {"["}{areaInfo.boundingBox.map(coord => coord.toFixed(4)).join(", ")}{"]"}
              </dd>
            </div>
            
            <div>
              <dt className="font-medium text-olive-600">{t("osmLink")}</dt>
              <dd>
                <a
                  href={`https://www.openstreetmap.org/relation/${areaInfo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 underline"
                >
                  {t("viewOnOpenStreetMap")}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}