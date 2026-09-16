import { z } from "zod";

// Nominatim API response schema for area search
export const NominatimResultSchema = z.object({
  place_id: z.number(),
  osm_type: z.string(),
  osm_id: z.number(),
  display_name: z.string(),
  name: z.string(),
  // name / name:<lang> tags; only present when the request includes namedetails=1.
  namedetails: z.record(z.string(), z.string()).nullish(),
  class: z.string(), // Primary category (e.g., "place", "amenity")
  type: z.string(), // Subcategory within class (e.g., "city", "village", "town")
  addresstype: z.string().optional(), // Address type (e.g., "municipality", "city", "village")
  // Search ranking hints. This schema also validates /lookup (area page,
  // dataset creation, refresh), so a malformed hint is dropped, never fatal.
  importance: z.number().optional().catch(undefined),
  place_rank: z.number().optional().catch(undefined), // 4 country, 8 state, 16 city (normalized across countries)
  // Raw OSM tags plus Nominatim's admin_level; only present when the request includes extratags=1.
  extratags: z.record(z.string(), z.string()).nullish().catch(undefined),
  boundingbox: z.array(z.string()).length(4), // [minLat, maxLat, minLon, maxLon]
  lat: z.string(),
  lon: z.string(),
  address: z
    .object({
      country_code: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      hamlet: z.string().optional(),
      suburb: z.string().optional(),
      neighbourhood: z.string().optional(),
      postcode: z.string().optional(),
      road: z.string().optional(),
      house_number: z.string().optional(),
    })
    .optional(),
});

// Array of Nominatim results
export const NominatimSearchResponseSchema = z.array(NominatimResultSchema);

// Type exports
export type NominatimResult = z.infer<typeof NominatimResultSchema>;
export type NominatimSearchResponse = z.infer<
  typeof NominatimSearchResponseSchema
>;
