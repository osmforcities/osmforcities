"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);

  const handleWatch = async () => {
    if (!isPublic) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/monitors/${monitorId}/watch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monitorId }),
      });

      if (response.ok) {
        setIsWatched(true);
      } else {
        const error = await response.json();
        console.error("Error watching monitor:", error);
      }
    } catch (error) {
      console.error("Error watching monitor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnwatch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monitors/${monitorId}/watch`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monitorId }),
      });

      if (response.ok) {
        setIsWatched(false);
      } else {
        const error = await response.json();
        console.error("Error unwatching monitor:", error);
      }
    } catch (error) {
      console.error("Error unwatching monitor:", error);
    } finally {
      setIsLoading(false);
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
