import { useQuery } from "@tanstack/react-query";
import { searchAreasWithNominatim } from "@/lib/nominatim-search";
import { InvalidAreaError } from "@/lib/area-conversion";
import { toAreaSearchResult, type AreaSearchResult } from "@/lib/area-search";

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
    // React Query aborts the signal when the term changes, so a search still
    // waiting for its rate-limit slot never reaches Nominatim.
    queryFn: ({ signal }) =>
      searchAreasWithNominatim(searchTerm, language, signal),
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

  const areas: AreaSearchResult[] = data?.map((result) => {
    try {
      return toAreaSearchResult(result);
    } catch (error) {
      if (error instanceof InvalidAreaError) {
        console.warn("Invalid area data skipped:", result, error);
        return null;
      }
      throw error;
    }
  }).filter((area): area is AreaSearchResult => area !== null) || [];

  return {
    data: areas,
    isLoading,
    error: error as Error | null,
    isError,
  };
}
