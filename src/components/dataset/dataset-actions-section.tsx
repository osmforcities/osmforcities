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
  onRefreshed?: (lastChecked: Date) => void;
};

export function DatasetActionsSection({
  dataset,
  savedCount = 0,
  saveLimit,
  onRefreshed,
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

  // One save-button state drives label and tooltip so they cannot drift.
  // canSave === false: signed-out visitor on a public featured page
  // (undefined means the producer predates the field — allowed)
  const saveLabel = dataset.canSave === false
    ? { text: t("signInToSave"), title: t("signInToSave") }
    : isSaved
      ? { text: t("unsave"), title: t("unsaveTooltip") }
      : atLimit
        ? { text: t("saveLimitReached"), title: t("saveLimitReached") }
        : { text: t("save"), title: t("saveTooltip") };

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
      if (result.success) {
        onRefreshed?.(result.lastChecked ?? new Date());
      } else {
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

        {/* Refresh is an admin-only control */}
        {dataset.canRefresh && (
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
        )}

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

        {/* Save/Unsave Button — disabled for signed-out visitors on public
            featured pages (canSave false) */}
        <Button
          onClick={handleToggleSave}
          disabled={isLoading || atLimit || dataset.canSave === false}
          className="flex items-center gap-2 w-full h-10"
          variant={isSaved ? "default" : "outline"}
          title={saveLabel.title}
          data-testid={isSaved ? "dataset-unsave-button" : "dataset-save-button"}
        >
          {isSaved ? (
            <BookmarkMinus className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          {saveLabel.text}
        </Button>
        {atLimit && saveLimit !== undefined && (
          <p
            role="alert"
            data-testid="save-limit-message"
            className="text-sm text-amber-700 dark:text-amber-500"
          >
            {t.rich("saveLimitMessage", {
              limit: saveLimit,
              link: (chunks) => (
                <Link href="/dashboard" size="sm" variant="underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
