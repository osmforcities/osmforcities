import { useQuery } from "@tanstack/react-query";
import { searchAreasWithNominatim } from "@/lib/nominatim";
import { Area } from "@/types/area";

type UseNominatimSearchOptions = {
  searchTerm: string;
  enabled?: boolean;
};

export function useNominatimSearch({
  searchTerm,
  enabled = true,
}: UseNominatimSearchOptions) {
  return useQuery({
    queryKey: ["nominatim-search", searchTerm],
    queryFn: () => searchAreasWithNominatim(searchTerm),
    enabled: enabled && searchTerm.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useNominatimAreas({
  searchTerm,
  enabled = true,
}: UseNominatimSearchOptions) {
  const { data, isLoading, error, isError } = useNominatimSearch({
    searchTerm,
    enabled,
  });

  const areas: Area[] =
    data?.map((result) => ({
      id: result.osm_id,
      name: result.name || result.display_name.split(",")[0].trim(),
      displayName: result.display_name,
      osmType: result.osm_type,
      class: result.class,
      type: result.type,
      addresstype: result.addresstype,
      boundingBox: [
        parseFloat(result.boundingbox[0]),
        parseFloat(result.boundingbox[2]),
        parseFloat(result.boundingbox[1]),
        parseFloat(result.boundingbox[3]),
      ] as [number, number, number, number],
      countryCode: result.address?.country_code,
      country: result.address?.country,
    })) || [];

  return {
    data: areas,
    isLoading,
    error: error as Error | null,
    isError,
  };
}
