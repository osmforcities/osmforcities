import { NominatimSearchResponseSchema } from "@/schemas/nominatim";
import { fromNominatim } from "@/lib/area-conversion";
import { getUserAgent } from "@/lib/overpass/transport";
import type { Area } from "@/types/area";

// Safeguard to prevent external API calls in test mode
export function preventExternalCallsInTests() {
  if (process.env.NODE_ENV === "test") {
    throw new Error(
      "External API calls are not allowed in test mode. Use mocked responses instead."
    );
  }
}

/**
 * Fetch area details by OSM relation ID
 * @param osmRelationId - The OSM relation ID
 * @param language - The language code for the response (e.g., 'en', 'pt-BR', 'es')
 * @returns Promise<Area | null> - Area details or null if not found
 */
export async function getAreaDetailsById(
  osmRelationId: number,
  language: string = "en"
): Promise<Area | null> {
  preventExternalCallsInTests();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=R${osmRelationId}&format=json&addressdetails=1&extratags=1&namedetails=1&accept-language=${language}`,
      {
        next: { revalidate: 86400 }, // 24 hours
        headers: {
          "Accept-Language": language,
          "User-Agent": getUserAgent(),
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const rawData = await response.json();
    if (!rawData || rawData.length === 0) {
      return null;
    }

    // Validate with Zod before conversion (same schema as area search)
    const validatedData = NominatimSearchResponseSchema.parse(rawData);
    const result = validatedData[0];

    return fromNominatim(result);
  } catch (error) {
    console.error("Error fetching area details:", error);
    return null;
  }
}
