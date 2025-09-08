"use client";

import { GridList, GridListItem } from "react-aria-components";
import { Link as NextLink } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  MapPin,
  Heart,
  School,
  Hospital,
  FileX,
} from "lucide-react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
};

type DatasetGridProps = {
  templates: Template[];
  areaId: string;
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "education":
      return <School className="w-5 h-5" />;
    case "healthcare":
      return <Hospital className="w-5 h-5" />;
    case "amenities":
      return <Heart className="w-5 h-5" />;
    case "infrastructure":
      return <Building2 className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
};

export function DatasetGrid({ templates, areaId }: DatasetGridProps) {
  const t = useTranslations("AreaPage");

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center">
          <FileX className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t("noDatasetsAvailable")}
          </h3>
          <p className="text-gray-600 max-w-md">{t("noDatasetsDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t("availableDatasets")}
        </h2>
        <p className="text-gray-600">{t("chooseDatasetDescription")}</p>
      </div>

      <GridList
        items={templates}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="template-grid"
      >
        {(template) => (
          <GridListItem key={template.id} className="group">
            <NextLink
              href={`/area/${areaId}/template/${template.id}`}
              className="block"
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:border-olive-300 hover:bg-olive-50 transition-all duration-200 group-hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-olive-100 text-olive-600 rounded-lg">
                      {getCategoryIcon(template.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-olive-700">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {template.category}
                      </p>
                    </div>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                        {t("moreTags", {
                          count: String(template.tags.length - 3),
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </NextLink>
          </GridListItem>
        )}
      </GridList>
    </div>
  );
}
