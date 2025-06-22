"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useMonitorActions } from "@/hooks/useMonitorActions";

interface MonitorWatchButtonProps {
  monitorId: string;
  isWatched: boolean;
  isPublic: boolean;
}

export default function MonitorWatchButton({
  monitorId,
  isWatched: initialIsWatched,
  isPublic,
}: MonitorWatchButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const { watchMonitor, unwatchMonitor, isLoading } = useMonitorActions();

  const handleWatch = async () => {
    if (!isPublic) return;

    const result = await watchMonitor(monitorId);
    if (result.success) {
      setIsWatched(true);
    } else {
      console.error("Failed to watch monitor:", result.error);
    }
  };

  const handleUnwatch = async () => {
    const result = await unwatchMonitor(monitorId);
    if (result.success) {
      setIsWatched(false);
    } else {
      console.error("Failed to unwatch monitor:", result.error);
    }
  };

  if (!isPublic) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <EyeOff className="h-4 w-4 mr-2" />
          Private Monitor
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
