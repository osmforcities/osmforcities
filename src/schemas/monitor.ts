import { z } from "zod";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

export const MonitorStatsSchema = z.object({
  lastEdited: z.coerce.date().nullable().optional(),
  editorsCount: z.number(),
  elementVersionsCount: z.number(),
  changesetsCount: z.number(),
  oldestElement: z.coerce.date().nullable(),
  mostRecentElement: z.coerce.date().nullable(),
  averageElementAge: z.number().nullable(),
  averageElementVersion: z.number().nullable(),
});

export const CreateMonitorSchema = z.object({
  templateId: z.string(),
  osmRelationId: z.number(),
  isPublic: z.boolean().optional(),
});

export const WatchMonitorSchema = z.object({
  monitorId: z.string(),
});

export const UnwatchMonitorSchema = z.object({
  monitorId: z.string(),
});

export const MonitorSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  lastChecked: z.coerce.date().nullable(),
  dataCount: z.number(),
  stats: MonitorStatsSchema.nullable(),
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

export type Monitor = z.infer<typeof MonitorSchema>;
export type MonitorStats = z.infer<typeof MonitorStatsSchema>;
export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>;
export type WatchMonitorInput = z.infer<typeof WatchMonitorSchema>;
export type UnwatchMonitorInput = z.infer<typeof UnwatchMonitorSchema>;
