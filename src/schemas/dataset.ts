import { z } from "zod";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { RECENCY_BANDS } from "@/lib/dataset-recency";

export const RecencyBandsSchema = z.array(z.number()).length(RECENCY_BANDS.length);

export const GeometryMixSchema = z.object({
  points: z.number().int().nonnegative(),
  lines: z.number().int().nonnegative(),
  areas: z.number().int().nonnegative(),
  lineKm: z.number().nonnegative(),
  areaKm2: z.number().nonnegative(),
});

export const TagCountSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

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

  // Feature-based recency distributions. Optional: absent until a dataset is
  // (re)snapshotted — the panel hides the band charts, no client fallback.
  editRecencyBands: RecencyBandsSchema.optional(),
  mapperRecencyBands: RecencyBandsSchema.optional(),

  // Feature geometry split + measures. Optional: absent until a dataset is
  // (re)snapshotted — the panel hides the geometry block, no client fallback.
  geometryMix: GeometryMixSchema.optional(),

  // Per-key tag presence counts, sorted desc. Optional: absent until a dataset is
  // (re)snapshotted — the panel reads these stored counts only, no client fallback.
  tagCounts: z.array(TagCountSchema).optional(),
});

export const CreateDatasetSchema = z.object({
  templateId: z.string(),
  osmRelationId: z.number(),
});

export const SaveDatasetSchema = z.object({
  datasetId: z.string(),
});

export const UnsaveDatasetSchema = z.object({
  datasetId: z.string(),
});

export const DatasetSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  isActive: z.boolean(),
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
    category: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }).nullable(),
    description: z.string().nullable(),
    filterableTags: z.array(z.string()).optional(),
    // Query criteria (e.g. ["highway=bus_stop"]); their keys are excluded from
    // the Most-used-tags list since they are ~100% by definition.
    tags: z.array(z.string()).optional(),
  }),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
  area: z.object({
    id: z.number(),
    name: z.string(),
    names: z.record(z.string(), z.string()).nullish(),
    countryCode: z.string().nullable(),
    bounds: z.string().nullable(),
    centerLat: z.number().nullish(),
    centerLon: z.number().nullish(),
    geojson: GeoJSONFeatureCollectionSchema.nullable(),
  }),
  savedBy: z
    .array(
      z.object({
        id: z.string(),
        userId: z.string(),
        createdAt: z.coerce.date(),
      })
    )
    .optional(),
  isSaved: z.boolean().optional(),
  savedCount: z.number().optional(),
  canDelete: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  canFeature: z.boolean().optional(),
  canRefresh: z.boolean().optional(),
  // Optional: producers other than transformDataset omit it, and omission
  // must mean "allowed" — check with === false, never truthiness
  canSave: z.boolean().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetStats = z.infer<typeof DatasetStatsSchema>;
export type CreateDatasetInput = z.infer<typeof CreateDatasetSchema>;
export type SaveDatasetInput = z.infer<typeof SaveDatasetSchema>;
export type UnsaveDatasetInput = z.infer<typeof UnsaveDatasetSchema>;
