"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useDatasetActions } from "@/hooks/useDatasetActions";

interface DatasetWatchButtonProps {
  datasetId: string;
  isWatched: boolean;
  isPublic: boolean;
}

export default function DatasetWatchButton({
  datasetId,
  isWatched: initialIsWatched,
  isPublic,
}: DatasetWatchButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const { watchDataset, unwatchDataset, isLoading } = useDatasetActions();

  const handleWatch = async () => {
    if (!isPublic) return;

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

  if (!isPublic) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <EyeOff className="h-4 w-4 mr-2" />
          Private Dataset
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isWatched ? "default" : "outline"}
        size="sm"
        onClick={isWatched ? handleUnwatch : handleWatch}
        disabled={isLoading}
      >
        {isWatched ? (
          <Eye className="h-4 w-4 mr-2" />
        ) : (
          <Eye className="h-4 w-4 mr-2" />
        )}
        {isWatched ? "Watching" : "Watch"}
      </Button>
    </div>
  );
}
