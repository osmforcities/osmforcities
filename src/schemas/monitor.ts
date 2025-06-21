import { z } from "zod";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

export const CreateMonitorSchema = z.object({
  templateId: z.string(),
  osmRelationId: z.number(),
  isPublic: z.boolean().optional(),
});

export const MonitorSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  lastChecked: z.date().nullable(),
  dataCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
});

export type Monitor = z.infer<typeof MonitorSchema>;
export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>;
