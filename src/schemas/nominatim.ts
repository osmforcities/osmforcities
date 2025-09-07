import { z } from "zod";

// Nominatim API response schema for area search
export const NominatimResultSchema = z.object({
  place_id: z.number(),
  osm_type: z.string(),
  osm_id: z.number(),
  display_name: z.string(),
  name: z.string(),
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
