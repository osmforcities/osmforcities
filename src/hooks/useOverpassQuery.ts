import { useQuery } from "@tanstack/react-query";
import { executeOverpassQuery } from "@/lib/osm";
import { OSMElementSchema, type OSMElement } from "@/types/osm";

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
    queryFn: async (): Promise<OSMElement[]> => {
      if (!queryString) {
        return [];
      }

      try {
        const { elements } = await executeOverpassQuery(queryString);

        const validElements = elements.filter((element) => {
          const validation = OSMElementSchema.safeParse(element);
          if (!validation.success) {
            console.warn("Invalid OSM element:", element, validation.error);
            return false;
          }
          return true;
        });

        return validElements;
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
