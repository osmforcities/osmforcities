import type { Dataset } from "@/schemas/dataset";
import { useTranslations } from "next-intl";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = useTranslations("DatasetExplorer");
  
  return (
    <div>
      <div className="text-sm text-blue-600 hover:text-blue-800 mb-4">
        {t("backToDatasets")}
      </div>

      <h2 className="text-2xl font-bold mb-4">
        {t("datasetTitle", { 
          template: dataset.template.name,
          city: dataset.cityName 
        })}
      </h2>

      <div className="border-t border-gray-200 my-4"></div>
    </div>
  );
}
