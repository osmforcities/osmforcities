import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  WatchResponse,
  ApiResponse,
  RefreshResponse,
  UpdateMonitorResponse,
  MonitorsResponse,
  MonitorResponse,
  MonitorsResponseSchema,
  MonitorResponseSchema,
  WatchResponseSchema,
  RefreshResponseSchema,
  UpdateMonitorResponseSchema,
  ApiResponseSchema,
  WatchMonitorSchema,
  UnwatchMonitorSchema,
  UpdateMonitorSchema,
} from "@/types/api";

export function useMonitorActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getMonitors = async (): Promise<MonitorsResponse> => {
    return apiClient.get("/api/monitors", MonitorsResponseSchema);
  };

  const getMonitor = async (id: string): Promise<MonitorResponse> => {
    return apiClient.get(`/api/monitors/${id}`, MonitorResponseSchema);
  };

  const getPublicMonitors = async (): Promise<MonitorsResponse> => {
    return apiClient.get("/api/monitors/public", MonitorsResponseSchema);
  };

  const getWatchedMonitors = async (): Promise<MonitorsResponse> => {
    return apiClient.get("/api/monitors/watched", MonitorsResponseSchema);
  };

  const watchMonitor = async (
    monitorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = WatchMonitorSchema.parse({ monitorId });
      const result: WatchResponse = await apiClient.post(
        `/api/monitors/${monitorId}/watch`,
        WatchResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error watching monitor:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const unwatchMonitor = async (
    monitorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = UnwatchMonitorSchema.parse({ monitorId });
      const result: ApiResponse = await apiClient.delete(
        `/api/monitors/${monitorId}/watch`,
        ApiResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error unwatching monitor:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMonitor = async (
    monitorId: string
  ): Promise<{ success: boolean; error?: string; dataCount?: number }> => {
    setIsLoading(true);
    try {
      const result: RefreshResponse = await apiClient.post(
        `/api/monitors/${monitorId}/refresh`,
        RefreshResponseSchema
      );
      return {
        success: result.success,
        dataCount: result.dataCount,
      };
    } catch (error) {
      console.error("Error refreshing monitor:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (
    monitorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!confirm("Are you sure you want to delete this monitor?")) {
      return { success: false };
    }

    setDeletingId(monitorId);
    try {
      const result: ApiResponse = await apiClient.delete(
        `/api/monitors/${monitorId}`,
        ApiResponseSchema
      );
      window.location.reload();
      return { success: result.success };
    } catch (error) {
      console.error("Error deleting monitor:", error);
      alert("Failed to delete monitor");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setDeletingId(null);
    }
  };

  const toggleField = async (
    monitorId: string,
    field: "isActive" | "isPublic",
    currentValue: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const validatedData = UpdateMonitorSchema.parse({
        [field]: !currentValue,
      });
      const result: UpdateMonitorResponse = await apiClient.patch(
        `/api/monitors/${monitorId}`,
        UpdateMonitorResponseSchema,
        validatedData
      );

      window.location.reload();
      return { success: result.success };
    } catch (error) {
      console.error("Error updating monitor:", error);
      alert("Failed to update monitor");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    getMonitors,
    getMonitor,
    getPublicMonitors,
    getWatchedMonitors,

    watchMonitor,
    unwatchMonitor,
    refreshMonitor,
    isLoading,

    deletingId,
    handleDelete,
    toggleActive: (id: string, value: boolean) =>
      toggleField(id, "isActive", value),
    togglePublic: (id: string, value: boolean) =>
      toggleField(id, "isPublic", value),
  };
}
