import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";

/** The area's outline, or undefined while loading or when it has none. */
export function useAreaBoundary(areaId: number) {
  const { data } = useQuery<FeatureCollection>({
    queryKey: ["area-boundary", areaId],
    queryFn: async () => {
      const response = await fetch(`/api/areas/${areaId}/boundary`);
      // The route answers 404 for "no outline" and for an Overpass failure
      // alike, so a failure gets one more try before the place stays empty.
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    },
    staleTime: Infinity,
    // Each try can cost an Overpass geometry query.
    retry: 1,
  });
  return data;
}
