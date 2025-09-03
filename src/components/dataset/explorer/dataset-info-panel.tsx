import type { Dataset } from "@/schemas/dataset";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

type DatasetInfoPanelProps = {
  dataset: Dataset;
};

export async function DatasetInfoPanel({ dataset }: DatasetInfoPanelProps) {
  const t = await getTranslations("DatasetExplorer");
  const pageT = await getTranslations("DatasetPage");

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToDatasets")}
      </Link>

      <h2 className="text-2xl font-bold mb-4">
        {t("datasetTitle", {
          template: dataset.template.name,
          city: dataset.cityName,
        })}
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <span
          className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground"
          title={
            dataset.isActive
              ? "Dataset is actively being updated"
              : "Dataset is not currently being updated"
          }
        >
          {dataset.isActive ? pageT("active") : pageT("inactive")}
        </span>
        <span
          className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground"
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
