import { z } from "zod";
import { SaveDatasetSchema, UnsaveDatasetSchema } from "@/schemas/dataset";

const ApiResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  details: z.string().optional(),
});

const SaveResponseSchema = z.object({
  success: z.boolean(),
  save: z.object({
    id: z.string(),
    userId: z.string(),
    datasetId: z.string(),
    createdAt: z.coerce.date(),
  }),
});

const RefreshResponseSchema = z.object({
  success: z.boolean(),
  tilesState: z.string().nullable().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type SaveResponse = z.infer<typeof SaveResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export {
  ApiResponseSchema,
  SaveResponseSchema,
  RefreshResponseSchema,
  SaveDatasetSchema,
  UnsaveDatasetSchema,
};
