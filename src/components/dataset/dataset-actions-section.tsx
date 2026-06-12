"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Eye, EyeOff, Star } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import { useDatasetDownload } from "@/hooks/useDatasetDownload";
import { useDatasetActions } from "@/hooks/useDatasetActions";
import { useState } from "react";

type DatasetActionsSectionProps = {
  dataset: Dataset;
};

export function DatasetActionsSection({ dataset }: DatasetActionsSectionProps) {
  const t = useTranslations("DatasetPage");
  const { downloadDataset } = useDatasetDownload();
  const { watchDataset, unwatchDataset, refreshDataset, isLoading } =
    useDatasetActions();

  const [isWatched, setIsWatched] = useState(dataset.isWatched || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeatured, setIsFeatured] = useState(dataset.isFeatured ?? false);
  const [isFeaturingLoading, setIsFeaturingLoading] = useState(false);
  const [hasFeatureError, setHasFeatureError] = useState(false);

  const handleToggleWatch = async () => {
    try {
      if (isWatched) {
        const result = await unwatchDataset(dataset.id);
        if (result.success) {
          setIsWatched(false);
        } else {
          console.error("Failed to unwatch dataset:", result.error);
        }
      } else {
        const result = await watchDataset(dataset.id);
        if (result.success) {
          setIsWatched(true);
        } else {
          console.error("Failed to watch dataset:", result.error);
        }
      }
    } catch (error) {
      console.error("Error toggling watch:", error);
    }
  };

  const handleToggleFeatured = async () => {
    setHasFeatureError(false);
    setIsFeaturingLoading(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/feature`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to toggle featured status");
      const data = await res.json();
      setIsFeatured(data.isFeatured);
    } catch (error) {
      console.error("Error toggling featured status:", error);
      setHasFeatureError(true);
    } finally {
      setIsFeaturingLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshDataset(dataset.id);
      if (!result.success) {
        console.error("Failed to refresh dataset:", result.error);
      }
    } catch (error) {
      console.error("Error refreshing dataset:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="pt-4 pb-2">
      <div className="border-t border-gray-300 mb-4"></div>
      <div className="flex flex-col gap-3">
        {isFeatured && !dataset.canFeature && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <Star className="h-4 w-4 fill-current" />
            {t("featured")}
          </div>
        )}

        {dataset.canFeature && (
          <>
            <Button
              onClick={handleToggleFeatured}
              disabled={isFeaturingLoading}
              className="flex items-center gap-2 w-full h-10"
              variant={isFeatured ? "default" : "outline"}
              title={isFeatured ? t("unfeatureTitle") : t("featureTitle")}
            >
              <Star className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`} />
              {isFeatured ? t("unfeature") : t("feature")}
            </Button>
            {hasFeatureError && (
              <p role="alert" className="text-sm text-red-600">
                {t("featureError")}
              </p>
            )}
          </>
        )}

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={!dataset.isActive || isRefreshing}
          className="flex items-center gap-2 w-full h-10"
          variant="outline"
          title={
            !dataset.isActive
              ? "Only active datasets can be refreshed"
              : "Update dataset with latest OpenStreetMap data"
          }
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? t("refreshing") : t("refreshData")}
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

        {/* Watch/Unwatch Button */}
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
          data-testid={isWatched ? "dataset-unwatch-button" : "dataset-watch-button"}
        >
          {isWatched ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {isWatched ? t("unwatch") : t("watch")}
        </Button>
      </div>
    </div>
  );
}
