import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

export const OverpassFeatureSchema = z.object({
  type: z.string(),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  geometry: z
    .array(
      z.object({
        lat: z.number(),
        lon: z.number(),
      })
    )
    .optional(),
});

export type OverpassFeature = z.infer<typeof OverpassFeatureSchema>;

export const OverpassResponseSchema = z.object({
  elements: z.array(OverpassFeatureSchema),
});

export type OverpassResponse = z.infer<typeof OverpassResponseSchema>;

type UseOverpassQueryParams = {
  queryString: string;
  enabled?: boolean;
};

/**
 * Hook for fetching data from Overpass API
 *
 * @param queryString - The Overpass QL query string
 * @param enabled - Whether the query should be enabled (defaults to true if queryString is not empty)
 * @returns Query result with data, error, and loading state
 */
export function useOverpassQuery({
  queryString,
  enabled = !!queryString,
}: UseOverpassQueryParams) {
  return useQuery({
    refetchOnWindowFocus: false,
    queryKey: ["overpass", queryString],
    queryFn: async (): Promise<OverpassFeature[]> => {
      if (!queryString) {
        return [];
      }

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(queryString)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const rawData = await response.json();

      try {
        const validatedData = OverpassResponseSchema.parse(rawData);
        return validatedData.elements;
      } catch (error) {
        console.error("Invalid Overpass API response:", error);
        throw new Error("Invalid response format from Overpass API");
      }
    },
    enabled,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}
