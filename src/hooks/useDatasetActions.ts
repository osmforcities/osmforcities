import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  WatchResponse,
  ApiResponse,
  RefreshResponse,
  UpdateDatasetResponse,
  DatasetsResponse,
  DatasetResponse,
  DatasetsResponseSchema,
  DatasetResponseSchema,
  WatchResponseSchema,
  RefreshResponseSchema,
  UpdateDatasetResponseSchema,
  ApiResponseSchema,
  WatchDatasetSchema,
  UnwatchDatasetSchema,
  UpdateDatasetSchema,
} from "@/types/api";

export function useDatasetActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getDatasets = async (): Promise<DatasetsResponse> => {
    return apiClient.get("/api/datasets", DatasetsResponseSchema);
  };

  const getDataset = async (id: string): Promise<DatasetResponse> => {
    return apiClient.get(`/api/datasets/${id}`, DatasetResponseSchema);
  };

  const getPublicDatasets = async (): Promise<DatasetsResponse> => {
    return apiClient.get("/api/datasets/public", DatasetsResponseSchema);
  };

  const getWatchedDatasets = async (): Promise<DatasetsResponse> => {
    return apiClient.get("/api/datasets/watched", DatasetsResponseSchema);
  };

  const watchDataset = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = WatchDatasetSchema.parse({ datasetId });
      const result: WatchResponse = await apiClient.post(
        `/api/datasets/${datasetId}/watch`,
        WatchResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error watching dataset:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const unwatchDataset = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = UnwatchDatasetSchema.parse({ datasetId });
      const result: ApiResponse = await apiClient.delete(
        `/api/datasets/${datasetId}/watch`,
        ApiResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error unwatching dataset:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDataset = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string; dataCount?: number }> => {
    setIsLoading(true);
    try {
      const result: RefreshResponse = await apiClient.post(
        `/api/datasets/${datasetId}/refresh`,
        RefreshResponseSchema
      );
      return {
        success: result.success,
        dataCount: result.dataCount,
      };
    } catch (error) {
      console.error("Error refreshing dataset:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!confirm("Are you sure you want to delete this dataset?")) {
      return { success: false };
    }

    setDeletingId(datasetId);
    try {
      const result: ApiResponse = await apiClient.delete(
        `/api/datasets/${datasetId}`,
        ApiResponseSchema
      );
      window.location.reload();
      return { success: result.success };
    } catch (error: unknown) {
      console.error("Error deleting dataset:", error);

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as {
          response?: { status?: number; data?: { details?: string } };
        };
        if (
          apiError.response?.status === 403 &&
          apiError.response?.data?.details
        ) {
          alert(apiError.response.data.details);
        } else if (apiError.response?.data?.details) {
          alert(apiError.response.data.details);
        } else {
          alert("Failed to delete dataset");
        }
      } else {
        alert("Failed to delete dataset");
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setDeletingId(null);
    }
  };

  const toggleField = async (
    datasetId: string,
    field: "isActive" | "isPublic",
    currentValue: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const validatedData = UpdateDatasetSchema.parse({
        [field]: !currentValue,
      });
      const result: UpdateDatasetResponse = await apiClient.patch(
        `/api/datasets/${datasetId}`,
        UpdateDatasetResponseSchema,
        validatedData
      );

      window.location.reload();
      return { success: result.success };
    } catch (error) {
      console.error("Error updating dataset:", error);
      alert("Failed to update dataset");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    getDatasets,
    getDataset,
    getPublicDatasets,
    getWatchedDatasets,

    watchDataset,
    unwatchDataset,
    refreshDataset,
    isLoading,

    deletingId,
    handleDelete,
    toggleActive: (id: string, value: boolean) =>
      toggleField(id, "isActive", value),
    togglePublic: (id: string, value: boolean) =>
      toggleField(id, "isPublic", value),
  };
}
