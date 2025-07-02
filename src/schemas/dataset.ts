import { z } from "zod";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

export const DatasetStatsSchema = z.object({
  lastEdited: z.coerce.date().nullable().optional(),
  editorsCount: z.number(),
  elementVersionsCount: z.number(),
  changesetsCount: z.number(),
  oldestElement: z.coerce.date().nullable(),
  mostRecentElement: z.coerce.date().nullable(),
  averageElementAge: z.number().nullable(),
  averageElementVersion: z.number().nullable(),

  // Recent activity metrics (last 3 months)
  recentActivity: z
    .object({
      elementsEdited: z.number(),
      changesets: z.number(),
      editors: z.number(),
    })
    .optional(),

  // Quality indicators
  qualityMetrics: z
    .object({
      staleElementsCount: z.number(),
      recentlyUpdatedElementsCount: z.number(),
      staleElementsPercentage: z.number(),
      recentlyUpdatedElementsPercentage: z.number(),
    })
    .optional(),
});

export const CreateDatasetSchema = z.object({
  templateId: z.string(),
  osmRelationId: z.number(),
  isPublic: z.boolean().optional(),
});

export const WatchDatasetSchema = z.object({
  datasetId: z.string(),
});

export const UnwatchDatasetSchema = z.object({
  datasetId: z.string(),
});

export const DatasetSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  lastChecked: z.coerce.date().nullable(),
  dataCount: z.number(),
  stats: DatasetStatsSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  geojson: GeoJSONFeatureCollectionSchema.nullable(),
  bbox: z.array(z.number()).length(4).nullable(),
  template: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().nullable(),
  }),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  area: z.object({
    id: z.number(),
    name: z.string(),
    countryCode: z.string().nullable(),
    bounds: z.string().nullable(),
    geojson: GeoJSONFeatureCollectionSchema.nullable(),
  }),
  watchers: z
    .array(
      z.object({
        id: z.string(),
        userId: z.string(),
        createdAt: z.coerce.date(),
      })
    )
    .optional(),
  isWatched: z.boolean().optional(),
  watchersCount: z.number().optional(),
  canDelete: z.boolean().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetStats = z.infer<typeof DatasetStatsSchema>;
export type CreateDatasetInput = z.infer<typeof CreateDatasetSchema>;
export type WatchDatasetInput = z.infer<typeof WatchDatasetSchema>;
export type UnwatchDatasetInput = z.infer<typeof UnwatchDatasetSchema>;
