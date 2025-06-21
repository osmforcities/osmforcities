import { z } from "zod";
import type { FeatureCollection } from "geojson";

const GeometrySchema = z.object({
  type: z.enum([
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
    "GeometryCollection",
  ]),
  coordinates: z.unknown(),
});

const FeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: GeometrySchema,
  properties: z.record(z.unknown()).nullable(),
  id: z.any().optional(),
});

export const GeoJSONFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FeatureSchema),
}) as z.ZodType<FeatureCollection>;

export type GeoJSONFeatureCollection = FeatureCollection;
