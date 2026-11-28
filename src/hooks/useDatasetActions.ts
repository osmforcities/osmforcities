import { useState } from "react";
import { ApiError, apiClient } from "@/lib/api-client";
import {
  SaveResponse,
  ApiResponse,
  RefreshResponse,
  SaveResponseSchema,
  RefreshResponseSchema,
  ApiResponseSchema,
  SaveDatasetSchema,
  UnsaveDatasetSchema,
} from "@/types/api";

export function useDatasetActions() {
  const [isLoading, setIsLoading] = useState(false);

  const saveDataset = async (
    datasetId: string,
    notifyWhenReady?: boolean
  ): Promise<{ success: boolean; error?: string; status?: number }> => {
    setIsLoading(true);
    try {
      const validatedData = SaveDatasetSchema.parse({
        datasetId,
        notifyWhenReady,
      });
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
        status: error instanceof ApiError ? error.status : undefined,
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
  ): Promise<RefreshResponse & { error?: string }> => {
    setIsLoading(true);
    try {
      return await apiClient.post(
        `/api/datasets/${datasetId}/refresh`,
        RefreshResponseSchema
      );
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

  return {
    saveDataset,
    unsaveDataset,
    refreshDataset,
    isLoading,
  };
}
