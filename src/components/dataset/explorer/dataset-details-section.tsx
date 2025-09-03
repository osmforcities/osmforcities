import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";

type DatasetDetailsSectionProps = {
  dataset: Dataset;
};

export function DatasetDetailsSection({ dataset }: DatasetDetailsSectionProps) {
  const t = useTranslations("DatasetExplorer");
  
  return (
    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">{t("datasetDetails")}</h3>
        <p className="text-sm text-gray-600">
          {t("datasetDescription", { 
            template: dataset.template.name.toLowerCase(),
            city: dataset.cityName 
          })}
        </p>
      </div>
    </div>
  );
}
