import { useQuery } from "@tanstack/react-query";
import { searchAreasWithNominatim } from "@/lib/nominatim";
import { fromNominatim } from "@/lib/area-conversion";
import { Area } from "@/types/area";

type UseNominatimSearchOptions = {
  searchTerm: string;
  language?: string;
  enabled?: boolean;
};

export function useNominatimSearch({
  searchTerm,
  language = "en",
  enabled = true,
}: UseNominatimSearchOptions) {
  return useQuery({
    queryKey: ["nominatim-search", searchTerm, language],
    queryFn: () => searchAreasWithNominatim(searchTerm, language),
    enabled: enabled && searchTerm.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useNominatimAreas({
  searchTerm,
  language = "en",
  enabled = true,
}: UseNominatimSearchOptions) {
  const { data, isLoading, error, isError } = useNominatimSearch({
    searchTerm,
    language,
    enabled,
  });

  const areas: Area[] = data?.map((result) => fromNominatim(result)) || [];

  return {
    data: areas,
    isLoading,
    error: error as Error | null,
    isError,
  };
}
