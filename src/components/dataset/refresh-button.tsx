"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DatasetRefreshButtonProps {
  datasetId: string;
  isActive: boolean;
  onRefresh?: (newDataCount: number) => void;
}

export default function DatasetRefreshButton({
  datasetId,
  isActive,
  onRefresh,
}: DatasetRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const t = useTranslations("DatasetPage");

  const handleRefresh = async () => {
    if (!isActive) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/datasets/${datasetId}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh dataset");
      }

      const result = await response.json();

      if (onRefresh) {
        onRefresh(result.dataCount);
      }

    } catch (error) {
      console.error("Error refreshing dataset:", error);
      alert("Failed to refresh dataset data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={!isActive || isRefreshing}
      variant="outline"
      size="sm"
      className="p-2"
      aria-label={isRefreshing ? t("refreshing") : t("refreshData")}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
}
