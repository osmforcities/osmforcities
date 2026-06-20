import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  SaveResponse,
  ApiResponse,
  RefreshResponse,
  UpdateDatasetResponse,
  DatasetsResponse,
  DatasetResponse,
  DatasetsResponseSchema,
  DatasetResponseSchema,
  SaveResponseSchema,
  RefreshResponseSchema,
  UpdateDatasetResponseSchema,
  ApiResponseSchema,
  SaveDatasetSchema,
  UnsaveDatasetSchema,
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

  const saveDataset = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = SaveDatasetSchema.parse({ datasetId });
      const result: SaveResponse = await apiClient.post(
        `/api/datasets/${datasetId}/save`,
        SaveResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error saving dataset:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const unsaveDataset = async (
    datasetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const validatedData = UnsaveDatasetSchema.parse({ datasetId });
      const result: ApiResponse = await apiClient.delete(
        `/api/datasets/${datasetId}/save`,
        ApiResponseSchema,
        validatedData
      );
      return { success: result.success };
    } catch (error) {
      console.error("Error unsaving dataset:", error);
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
    field: "isActive",
    currentValue: boolean,
    onSuccess?: () => void
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

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
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

    saveDataset,
    unsaveDataset,
    refreshDataset,
    isLoading,

    deletingId,
    handleDelete,
    toggleActive: (id: string, value: boolean, onSuccess?: () => void) =>
      toggleField(id, "isActive", value, onSuccess),
  };
}
