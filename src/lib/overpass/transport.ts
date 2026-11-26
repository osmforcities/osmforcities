import osmtogeojson from "osmtogeojson";
import type { FeatureCollection } from "geojson";
import {
  OverpassErrorSchema,
  type OverpassResponse,
  type OverpassData,
} from "@/types/overpass";
import { OSMElementSchema } from "@/types/osm";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { COUNT_REQUEST_TIMEOUT_MS } from "@/lib/constants";

const OVERPASS_API_URL =
  process.env.OVERPASS_API_URL ||
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter";

/**
 * Overpass request aborted because it exceeded the allowed time, or Overpass
 * gave up on the query itself (HTTP 200 + remark: timeout, out of memory)
 */
export class OverpassTimeoutError extends Error {
  constructor(message = "Overpass request timed out") {
    super(message);
    this.name = "OverpassTimeoutError";
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

export function getUserAgent(): string {
  if (process.env.OSM_USER_AGENT) {
    return process.env.OSM_USER_AGENT;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org";
  const url = baseUrl.replace(/^https?:\/\//, "");
  return `OSMForCities (+https://${url})`;
}

function isLocalUrl(url: string | undefined): boolean {
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

export function assertLocalInTests(url: string | undefined): void {
  if (process.env.NODE_ENV === "test" && !isLocalUrl(url)) {
    throw new Error(
      "External API calls are not allowed in test mode. Use mocked responses instead."
    );
  }
}

export async function executeOverpassQuery(
  queryString: string
): Promise<OverpassResponse> {
  assertLocalInTests(OVERPASS_API_URL);

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

  return parseOverpassBody(await response.text());
}

/**
 * Overpass reports failures inside HTTP 200 bodies. A remark means the query
 * was cut short (timeout, out of memory): returning its elements would store
 * a provider failure as an area that has none of the feature.
 */
function parseOverpassBody(text: string): OverpassResponse {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Overpass API returned non-JSON response");
  }

  const errorValidation = OverpassErrorSchema.safeParse(data);
  if (errorValidation.success) {
    throw new Error(
      `Overpass API error: ${errorValidation.data.error.message}`
    );
  }

  if (data?.remark) {
    throw new OverpassTimeoutError(`Overpass API error: ${data.remark}`);
  }

  // Envelope only: convertOverpassToGeoJSON drops malformed elements one by one
  if (!Array.isArray(data?.elements)) {
    throw new Error("Overpass API returned an unexpected response shape");
  }

  return data as OverpassResponse;
}

export async function countOverpassElements(
  query: string,
  timeoutMs: number = COUNT_REQUEST_TIMEOUT_MS
): Promise<number> {
  assertLocalInTests(OVERPASS_API_URL);

  // The template's own [timeout:N] stays: on a lower one Overpass aborts counts that budget serves
  const countQuery = query.replace(/\bout(\s+[^;]+)?;\s*$/, "out count;");

  // The body read sits inside the try: Overpass sends the 200 headers at once
  // and the body only when the query ends, so the abort usually lands there.
  let data;
  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": getUserAgent(),
      },
      body: `data=${encodeURIComponent(countQuery)}`,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status === 504) {
      throw new OverpassTimeoutError();
    }
    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    data = await response.json();
  } catch (error) {
    if (isTimeoutError(error)) throw new OverpassTimeoutError();
    throw error;
  }
  const total = data?.elements?.[0]?.tags?.total;
  if (total === undefined) {
    // Overpass answers a count that ran out of time or memory with HTTP 200 + a `remark`
    if (data?.remark) {
      throw new OverpassTimeoutError();
    }
    throw new Error("Unexpected response format from Overpass count query");
  }
  const elementCount = parseInt(total, 10);
  if (!Number.isInteger(elementCount)) {
    throw new Error(`Invalid element count from Overpass: "${total}"`);
  }
  return elementCount;
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
