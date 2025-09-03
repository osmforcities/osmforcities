"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Eye, EyeOff } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import { useDatasetDownload } from "@/hooks/useDatasetDownload";
import { useDatasetActions } from "@/hooks/useDatasetActions";

type DatasetActionsSectionProps = {
  dataset: Dataset;
};

export function DatasetActionsSection({ dataset }: DatasetActionsSectionProps) {
  const t = useTranslations("DatasetExplorer");
  const { downloadDataset } = useDatasetDownload();
  const { watchDataset, unwatchDataset, refreshDataset, isLoading } =
    useDatasetActions();

  const isWatched = dataset.isWatched || false;
  const canWatch = dataset.isPublic;

  const handleToggleWatch = async () => {
    if (isWatched) {
      await unwatchDataset(dataset.id);
    } else {
      await watchDataset(dataset.id);
    }
    window.location.reload();
  };

  const handleRefresh = async () => {
    const result = await refreshDataset(dataset.id);
    if (result.success) {
      window.location.reload();
    }
  };

  return (
    <div className="pt-4 pb-2">
      <div className="border-t border-gray-300 mb-4"></div>
      <div className="flex flex-col gap-3">
        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={!dataset.isActive || isLoading}
          className="flex items-center gap-2 w-full h-10"
          variant="outline"
          title={
            !dataset.isActive
              ? "Only active datasets can be refreshed"
              : "Update dataset with latest OpenStreetMap data"
          }
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? t("refreshing") : t("refreshData")}
        </Button>

        {/* Download Button */}
        <Button
          onClick={() => downloadDataset(dataset)}
          disabled={!dataset.geojson}
          className="flex items-center gap-2 w-full h-10"
          variant="outline"
          title={
            !dataset.geojson
              ? "No data available for download"
              : "Download dataset as GeoJSON file"
          }
        >
          <Download className="h-4 w-4" />
          {t("downloadData")}
        </Button>

        {/* Watch/Unwatch Button - Only show for public datasets */}
        {canWatch && (
          <Button
            onClick={handleToggleWatch}
            disabled={isLoading}
            className="flex items-center gap-2 w-full h-10"
            variant={isWatched ? "default" : "outline"}
            title={
              isWatched
                ? "Stop receiving updates about this dataset"
                : "Get notified when this dataset is updated"
            }
          >
            {isWatched ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isWatched ? t("unwatch") : t("watch")}
          </Button>
        )}
      </div>
    </div>
  );
}
