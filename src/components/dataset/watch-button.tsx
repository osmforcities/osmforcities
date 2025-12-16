"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useDatasetActions } from "@/hooks/useDatasetActions";

interface DatasetWatchButtonProps {
  datasetId: string;
  isWatched: boolean;
}

export default function DatasetWatchButton({
  datasetId,
  isWatched: initialIsWatched,
}: DatasetWatchButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const { watchDataset, unwatchDataset, isLoading } = useDatasetActions();

  const handleWatch = async () => {
    const result = await watchDataset(datasetId);
    if (result.success) {
      setIsWatched(true);
    } else {
      console.error("Failed to watch dataset:", result.error);
    }
  };

  const handleUnwatch = async () => {
    const result = await unwatchDataset(datasetId);
    if (result.success) {
      setIsWatched(false);
    } else {
      console.error("Failed to unwatch dataset:", result.error);
    }
  };

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      size="sm"
      onClick={isWatched ? handleUnwatch : handleWatch}
      disabled={isLoading}
      className="px-3 py-2"
      title={isWatched ? "Unwatch" : "Watch"}
      data-testid={isWatched ? "dataset-unwatch-button" : "dataset-watch-button"}
    >
      <Eye className="h-4 w-4 mr-2" />
      {isWatched ? "Unwatch" : "Watch"}
    </Button>
  );
}
