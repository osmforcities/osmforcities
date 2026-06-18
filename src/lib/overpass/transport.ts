import osmtogeojson from "osmtogeojson";
import type { FeatureCollection } from "geojson";
import {
  OverpassErrorSchema,
  type OverpassResponse,
  type OverpassData,
} from "@/types/overpass";
import { OSMElementSchema } from "@/types/osm";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

const OVERPASS_API_URL =
  process.env.OVERPASS_API_URL ||
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter";

export function getUserAgent(): string {
  if (process.env.OSM_USER_AGENT) {
    return process.env.OSM_USER_AGENT;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org";
  const url = baseUrl.replace(/^https?:\/\//, "");
  return `OSMForCities (+https://${url})`;
}

function isLocalOverpass(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export function preventExternalCallsInTests(): void {
  if (process.env.NODE_ENV === "test" && !isLocalOverpass(OVERPASS_API_URL)) {
    throw new Error(
      "External API calls are not allowed in test mode. Use mocked responses instead."
    );
  }
}

export async function executeOverpassQuery(
  queryString: string
): Promise<OverpassResponse> {
  preventExternalCallsInTests();

  const response = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": getUserAgent(),
    },
    body: `data=${encodeURIComponent(queryString)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();

  const errorValidation = OverpassErrorSchema.safeParse(data);
  if (errorValidation.success) {
    throw new Error(
      `Overpass API error: ${errorValidation.data.error.message}`
    );
  }

  return data as OverpassResponse;
}

export async function countOverpassElements(query: string): Promise<number> {
  preventExternalCallsInTests();

  const countQuery = query
    .replace(/\[timeout:\d+\]/, "[timeout:10]")
    .replace(/out\s+[^;]+;\s*$/, "out count;");

  const response = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": getUserAgent(),
    },
    body: `data=${encodeURIComponent(countQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const total = data?.elements?.[0]?.tags?.total;
  if (total === undefined) {
    throw new Error("Unexpected response format from Overpass count query");
  }
  return parseInt(total, 10);
}

export function convertOverpassToGeoJSON(
  overpassData: OverpassData
): FeatureCollection {
  if (!overpassData.elements || !Array.isArray(overpassData.elements)) {
    return { type: "FeatureCollection", features: [] };
  }

  try {
    const validElements = overpassData.elements.filter((element) => {
      const validation = OSMElementSchema.safeParse(element);
      if (!validation.success) {
        console.warn("Invalid OSM element:", element, validation.error);
        return false;
      }
      return true;
    });

    if (validElements.length === 0) {
      return { type: "FeatureCollection", features: [] };
    }

    const validOverpassData = { ...overpassData, elements: validElements };
    const geojson = osmtogeojson(validOverpassData);

    const geojsonValidation = GeoJSONFeatureCollectionSchema.safeParse(geojson);
    if (!geojsonValidation.success) {
      console.error(
        "Invalid GeoJSON from osmtogeojson:",
        geojsonValidation.error
      );
      throw new Error("osmtogeojson returned invalid GeoJSON");
    }

    return geojsonValidation.data as FeatureCollection;
  } catch (error) {
    console.error("Error converting Overpass data to GeoJSON:", error);
    return { type: "FeatureCollection", features: [] };
  }
}
