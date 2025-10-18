import { z } from "zod";
import {
  DatasetSchema,
  WatchDatasetSchema,
  UnwatchDatasetSchema,
} from "@/schemas/dataset";

const ApiResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  details: z.string().optional(),
});

const DatasetsResponseSchema = z.array(DatasetSchema);

const DatasetResponseSchema = DatasetSchema;

const WatchResponseSchema = z.object({
  success: z.boolean(),
  watch: z.object({
    id: z.string(),
    userId: z.string(),
    datasetId: z.string(),
    createdAt: z.coerce.date(),
  }),
});

const RefreshResponseSchema = z.object({
  success: z.boolean(),
  dataCount: z.number().optional(),
  lastChecked: z.coerce.date().optional(),
});

const UpdateDatasetSchema = z.object({
  isActive: z.boolean().optional(),
});

const UpdateDatasetResponseSchema = ApiResponseSchema;

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type DatasetResponse = z.infer<typeof DatasetResponseSchema>;
export type DatasetsResponse = z.infer<typeof DatasetsResponseSchema>;
export type WatchResponse = z.infer<typeof WatchResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type UpdateDatasetInput = z.infer<typeof UpdateDatasetSchema>;
export type UpdateDatasetResponse = z.infer<typeof UpdateDatasetResponseSchema>;

export {
  ApiResponseSchema,
  DatasetResponseSchema,
  DatasetsResponseSchema,
  WatchResponseSchema,
  RefreshResponseSchema,
  UpdateDatasetSchema,
  UpdateDatasetResponseSchema,
  WatchDatasetSchema,
  UnwatchDatasetSchema,
};
