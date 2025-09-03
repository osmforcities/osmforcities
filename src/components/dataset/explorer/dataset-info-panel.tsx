import type { Dataset } from "@/schemas/dataset";
import { getTranslations } from "next-intl/server";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export async function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = await getTranslations("DatasetExplorer");
  const pageT = await getTranslations("DatasetPage");

  return (
    <div>
      <div className="text-sm text-blue-600 hover:text-blue-800 mb-4">
        {t("backToDatasets")}
      </div>

      <h2 className="text-2xl font-bold mb-4">
        {t("datasetTitle", {
          template: dataset.template.name,
          city: dataset.cityName,
        })}
      </h2>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`px-3 py-1 text-sm rounded-full ${
            dataset.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
          title={
            dataset.isActive
              ? "Dataset is actively being updated"
              : "Dataset is not currently being updated"
          }
        >
          {dataset.isActive ? pageT("active") : pageT("inactive")}
        </span>
        <span
          className={`px-3 py-1 text-sm rounded-full capitalize ${
            dataset.isPublic
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          }`}
          title={
            dataset.isPublic
              ? "Dataset is visible to all users"
              : "Dataset is only visible to you"
          }
        >
          {dataset.isPublic ? pageT("public") : pageT("private")}
        </span>
      </div>

      <div className="border-t border-gray-200 my-4"></div>
    </div>
  );
}
