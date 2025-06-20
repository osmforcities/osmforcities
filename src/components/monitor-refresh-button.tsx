"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface MonitorRefreshButtonProps {
  monitorId: string;
  isActive: boolean;
  onRefresh?: (newDataCount: number) => void;
}

export default function MonitorRefreshButton({
  monitorId,
  isActive,
  onRefresh,
}: MonitorRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!isActive) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/monitors/${monitorId}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh monitor");
      }

      const result = await response.json();

      if (onRefresh) {
        onRefresh(result.dataCount);
      }

      console.log(
        `Monitor refreshed successfully. Found ${result.dataCount} items.`
      );
    } catch (error) {
      console.error("Error refreshing monitor:", error);
      alert("Failed to refresh monitor data. Please try again.");
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
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Refreshing..." : "Refresh Data"}
    </Button>
  );
}
