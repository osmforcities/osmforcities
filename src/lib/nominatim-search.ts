import {
  NominatimSearchResponseSchema,
  type NominatimResult,
} from "@/schemas/nominatim";
import { dedupeAreas, rankByScale } from "@/lib/area-search";
import { preventExternalCallsInTests } from "@/lib/nominatim";
import { getUserAgent } from "@/lib/overpass/transport";

// Nominatim usage policy: an absolute maximum of 1 request per second. Search
// runs in the browser (nav search), so this module-level slot is per browser;
// server code only uses the lookup in @/lib/nominatim.
const MIN_SEARCH_INTERVAL_MS = 1000;
let nextSearchAt = 0;

/**
 * Wait for the next free search slot, reserving it. If the search is aborted
 * while waiting, reject right away and hand the slot back when nothing has
 * queued behind it, so the search that replaced it does not wait twice.
 */
function waitForSearchSlot(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const now = Date.now();
  const slot = Math.max(now, nextSearchAt);
  nextSearchAt = slot + MIN_SEARCH_INTERVAL_MS;
  if (slot <= now) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      if (nextSearchAt === slot + MIN_SEARCH_INTERVAL_MS) nextSearchAt = slot;
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, slot - now);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Search for areas using Nominatim API
 * @param searchTerm - The search term to query
 * @param language - The language code for the response (e.g., 'en', 'pt-BR', 'es')
 * @param signal - Aborts a search superseded by newer input
 * @returns Promise<NominatimResult[]> - Relations, deduped and ranked by scale
 */
export async function searchAreasWithNominatim(
  searchTerm: string,
  language: string = "en",
  signal?: AbortSignal
): Promise<NominatimResult[]> {
  if (searchTerm.length < 3) {
    return [];
  }

  preventExternalCallsInTests();
  await waitForSearchSlot(signal);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchTerm
      )}&format=json&addressdetails=1&extratags=1&limit=10&accept-language=${encodeURIComponent(
        language
      )}`,
      {
        signal,
        headers: {
          "Accept-Language": language,
          "User-Agent": getUserAgent(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      );
    }

    const rawData = await response.json();

    // Validate the response with Zod
    const validatedData = NominatimSearchResponseSchema.parse(rawData);

    // Filter to only include relations (areas like cities, regions, etc.)
    const filteredResults = validatedData.filter(
      (result) => result.osm_type === "relation"
    );

    return rankByScale(dedupeAreas(filteredResults));
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error("Error searching areas with Nominatim:", error);
    throw new Error("Failed to search for areas. Please try again.");
  }
}
