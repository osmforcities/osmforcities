import {
  NominatimSearchResponseSchema,
  type NominatimResult,
} from "@/schemas/nominatim";
import { Area } from "@/types/area";

/**
 * Search for areas using Nominatim API
 * @param searchTerm - The search term to query
 * @param language - The language code for the response (e.g., 'en', 'pt-BR', 'es')
 * @returns Promise<NominatimResult[]> - Array of validated Nominatim results
 */
export async function searchAreasWithNominatim(
  searchTerm: string,
  language: string = "en"
): Promise<NominatimResult[]> {
  if (searchTerm.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchTerm
      )}&format=json&addressdetails=1&limit=10&polygon_geojson=1&osm_type=relation`,
      {
        headers: {
          "Accept-Language": language,
          "User-Agent": "OSMForCities/1.0",
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

    return filteredResults;
  } catch (error) {
    console.error("Error searching areas with Nominatim:", error);
    throw new Error("Failed to search for areas. Please try again.");
  }
}

/**
 * Convert Nominatim result to Area type
 * @param result - Nominatim result
 * @returns Area - Converted area object
 */
export function convertNominatimResultToArea(result: NominatimResult): Area {
  return {
    id: result.osm_id,
    name: result.name || result.display_name.split(",")[0].trim(),
    displayName: result.display_name,
    osmType: result.osm_type,
    class: result.class,
    type: result.type,
    addresstype: result.addresstype,
    boundingBox: [
      parseFloat(result.boundingbox[0]), // minLat
      parseFloat(result.boundingbox[2]), // minLon
      parseFloat(result.boundingbox[1]), // maxLat
      parseFloat(result.boundingbox[3]), // maxLon
    ],
    countryCode: result.address?.country_code,
    country: result.address?.country,
  };
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
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=R${osmRelationId}&format=json&addressdetails=1&extratags=1`,
      {
        headers: {
          "Accept-Language": language,
          "User-Agent": "OSMForCities/1.0",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    // Convert the lookup result to our Area format
    const result = data[0];
    return {
      id: osmRelationId,
      name: result.name || result.display_name.split(",")[0].trim(),
      displayName: result.display_name,
      osmType: "relation" as const,
      class: result.class || "",
      type: result.type || "",
      addresstype: result.addresstype,
      boundingBox: [
        parseFloat(result.boundingbox[0]),
        parseFloat(result.boundingbox[2]),
        parseFloat(result.boundingbox[1]),
        parseFloat(result.boundingbox[3]),
      ],
      countryCode: result.address?.country_code,
      country: result.address?.country,
      state: result.address?.state,
    };
  } catch (error) {
    console.error("Error fetching area details:", error);
    return null;
  }
}
