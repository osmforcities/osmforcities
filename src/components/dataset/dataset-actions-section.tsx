"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Download, RefreshCw, Bookmark, BookmarkMinus, Star } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import { useDatasetDownload } from "@/hooks/useDatasetDownload";
import { useDatasetActions } from "@/hooks/useDatasetActions";
import { useState } from "react";

type DatasetActionsSectionProps = {
  dataset: Dataset;
  savedCount?: number;
  saveLimit?: number;
};

export function DatasetActionsSection({
  dataset,
  savedCount = 0,
  saveLimit,
}: DatasetActionsSectionProps) {
  const t = useTranslations("DatasetPage");
  const { downloadDataset } = useDatasetDownload();
  const { saveDataset, unsaveDataset, refreshDataset, isLoading } =
    useDatasetActions();

  const [isSaved, setIsSaved] = useState(dataset.isSaved || false);
  const [saveCount, setSaveCount] = useState(savedCount);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeatured, setIsFeatured] = useState(dataset.isFeatured ?? false);
  const [isFeaturingLoading, setIsFeaturingLoading] = useState(false);
  const [hasFeatureError, setHasFeatureError] = useState(false);

  const atLimit =
    !isSaved &&
    saveLimit !== undefined &&
    saveCount >= saveLimit;

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        const result = await unsaveDataset(dataset.id);
        if (result.success) {
          setIsSaved(false);
          setSaveCount((c) => Math.max(0, c - 1));
        } else {
          console.error("Failed to unsave dataset:", result.error);
        }
      } else {
        const result = await saveDataset(dataset.id);
        if (result.success) {
          setIsSaved(true);
          setSaveCount((c) => c + 1);
        } else if (result.error === "save_limit_reached") {
          setSaveCount(saveLimit ?? saveCount);
        } else {
          console.error("Failed to save dataset:", result.error);
        }
      }
    } catch (error) {
      console.error("Error toggling save:", error);
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

        {/* Save/Unsave Button */}
        <Button
          onClick={handleToggleSave}
          disabled={isLoading || atLimit}
          className="flex items-center gap-2 w-full h-10"
          variant={isSaved ? "default" : "outline"}
          title={
            isSaved
              ? t("unsaveTooltip")
              : atLimit
                ? t("saveLimitReached")
                : t("saveTooltip")
          }
          data-testid={isSaved ? "dataset-unsave-button" : "dataset-save-button"}
        >
          {isSaved ? (
            <BookmarkMinus className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          {isSaved ? t("unsave") : atLimit ? t("saveLimitReached") : t("save")}
        </Button>
        {atLimit && saveLimit !== undefined && (
          <p
            role="alert"
            data-testid="save-limit-message"
            className="text-sm text-amber-700 dark:text-amber-500"
          >
            {t("saveLimitMessage", { limit: saveLimit })}
            <Link href="/dashboard" size="sm" variant="underline">
              {t("goToDashboard")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
