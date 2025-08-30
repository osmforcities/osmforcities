import { z } from "zod";
import type { FeatureCollection, Feature } from "geojson";

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

export const BboxSchema = z
  .array(z.number())
  .length(4)
  .refine(
    (bbox) => {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      return minLng <= maxLng && minLat <= maxLat;
    },
    {
      message:
        "Invalid bbox: minLng <= maxLng and minLat <= maxLat must be true",
    }
  );

export type GeoJSONFeatureCollection = FeatureCollection;
export type Bbox = z.infer<typeof BboxSchema>;

export type TooltipInfo = {
  latitude: number;
  longitude: number;
  feature: Feature;
};

export type DateFilter = "all" | "7days" | "30days" | "90days";

export const DATE_FILTER_OPTIONS = [
  { value: "all" as const, labelKey: "showAll" },
  { value: "7days" as const, labelKey: "last7Days" },
  { value: "30days" as const, labelKey: "last30Days" },
  { value: "90days" as const, labelKey: "last90Days" },
] as const;
