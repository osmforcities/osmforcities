"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import {
  Download,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  Star,
} from "lucide-react";
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
  const [shareCopied, setShareCopied] = useState(false);
  // Polite announcement for async action outcomes (share/refresh) so screen-reader
  // users get feedback the visual-only icon/label changes don't provide.
  const [statusMessage, setStatusMessage] = useState("");

  const atLimit =
    !isSaved && saveLimit !== undefined && saveCount >= saveLimit;

  // One save-button state drives label and tooltip so they cannot drift.
  // canSave === false: signed-out visitor on a public featured page
  // (undefined means the producer predates the field — allowed)
  const saveLabel =
    dataset.canSave === false
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setStatusMessage(t("linkCopied"));
      setTimeout(() => {
        setShareCopied(false);
        setStatusMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error copying dataset link:", error);
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
    setStatusMessage(t("refreshing"));
    try {
      const result = await refreshDataset(dataset.id);
      if (result.success) {
        onRefreshed?.(result.lastChecked ?? new Date());
        setStatusMessage(t("datasetSynced"));
      } else {
        console.error("Failed to refresh dataset:", result.error);
        setStatusMessage("");
      }
    } catch (error) {
      console.error("Error refreshing dataset:", error);
      setStatusMessage("");
    } finally {
      setIsRefreshing(false);
    }
  };

  const showAdmin = dataset.canFeature || dataset.canRefresh;

  return (
    <div className="flex flex-col gap-2 pt-2">
      {/* Screen-reader announcements for async action outcomes (share/refresh). */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>
      {/* Primary CTA — Save. Filled to invite use; switches to outline once done. */}
      <Button
        onClick={handleToggleSave}
        disabled={isLoading || atLimit || dataset.canSave === false}
        className="h-8 w-full text-sm"
        variant={isSaved ? "outline" : "default"}
        title={saveLabel.title}
        data-testid={isSaved ? "dataset-unsave-button" : "dataset-save-button"}
      >
        {isSaved ? (
          <BookmarkCheck className="h-4 w-4" />
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

      {/* Secondary toolbar — icon actions, grows by adding an icon not a row. */}
      <div className="flex gap-2">
        <Button
          onClick={() => downloadDataset(dataset)}
          disabled={!dataset.geojson}
          className="h-8 flex-1"
          variant="outline"
          title={t("downloadData")}
          aria-label={t("downloadData")}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleShare}
          className="h-8 flex-1"
          variant="outline"
          title={t("shareTooltip")}
          aria-label={shareCopied ? t("shareCopied") : t("share")}
        >
          {shareCopied ? (
            <span className="inline-flex items-center gap-1.5 text-olive-600">
              <Check className="h-4 w-4" />
              <span className="text-xs font-medium">{t("shareCopied")}</span>
            </span>
          ) : (
            <Share2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Admin cluster — not rendered at all for regular users. */}
      {showAdmin && (
        <div className="mt-0.5 flex flex-col gap-2 border-t border-dashed border-gray-200 pt-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">
            {t("admin")}
          </p>
          <div className="flex gap-2">
            {dataset.canRefresh && (
              <Button
                onClick={handleRefresh}
                disabled={!dataset.isActive || isRefreshing}
                aria-busy={isRefreshing}
                className="h-8 flex-1 text-xs"
                variant="outline"
                title={
                  !dataset.isActive
                    ? "Only active datasets can be synced"
                    : "Sync with the latest OpenStreetMap data"
                }
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
                />
                {isRefreshing ? t("refreshing") : t("refreshData")}
              </Button>
            )}
            {dataset.canFeature && (
              <Button
                onClick={handleToggleFeatured}
                disabled={isFeaturingLoading}
                className="h-8 flex-1 text-xs"
                variant="outline"
                title={isFeatured ? t("unfeatureTitle") : t("featureTitle")}
              >
                <Star
                  className={`h-3.5 w-3.5 ${isFeatured ? "fill-current" : ""}`}
                />
                {isFeatured ? t("unfeature") : t("feature")}
              </Button>
            )}
          </div>
          {hasFeatureError && (
            <p role="alert" className="text-sm text-red-600">
              {t("featureError")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
