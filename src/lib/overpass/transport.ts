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

const COUNT_REQUEST_TIMEOUT_MS = 30_000;
const FETCH_REQUEST_TIMEOUT_MS = 180_000;

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

/** Overpass response aborted because it exceeded the byte limit */
export class OverpassResponseTooLargeError extends Error {
  constructor(public readonly bytesRead: number, maxBytes: number) {
    super(
      `Overpass response exceeded ${maxBytes} bytes (aborted after ${bytesRead} bytes)`
    );
    this.name = "OverpassResponseTooLargeError";
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
  preventExternalCallsInTests();

  // Only the output statement changes — the template's own [timeout:N] is kept.
  // Capping the count at a lower value made Overpass abort (HTTP 200 + remark)
  // on queries the data fetch then served fine, and that false timeout verdict
  // blocked the area+template for SIZE_CHECK_TTL_HOURS.
  const countQuery = query.replace(/\bout(\s+[^;]+)?;\s*$/, "out count;");

  let response: Response;
  try {
    response = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": getUserAgent(),
      },
      body: `data=${encodeURIComponent(countQuery)}`,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw new OverpassTimeoutError();
    throw error;
  }

  if (response.status === 504) {
    throw new OverpassTimeoutError();
  }
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const total = data?.elements?.[0]?.tags?.total;
  if (total === undefined) {
    // Overpass answers oversized/expensive count queries with HTTP 200 + a `remark`
    // (query timed out / ran out of memory) instead of a count. Treat that as a timeout
    // verdict so it flows through the size-check path (recorded + skipped) rather than a
    // generic error that leaves the dataset re-failing forever (#431).
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

/**
 * Execute an Overpass query, aborting the download once the response
 * exceeds maxBytes. Aborting disconnects the socket, which causes
 * Overpass to kill the running query server-side.
 */
export async function executeOverpassQueryWithByteLimit(
  queryString: string,
  maxBytes: number
): Promise<OverpassResponse> {
  preventExternalCallsInTests();

  const controller = new AbortController();
  const timeoutSignal = AbortSignal.timeout(FETCH_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": getUserAgent(),
      },
      body: `data=${encodeURIComponent(queryString)}`,
      signal: AbortSignal.any([controller.signal, timeoutSignal]),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw new OverpassTimeoutError();
    throw error;
  }

  if (response.status === 504) {
    throw new OverpassTimeoutError();
  }
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  let text: string;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > maxBytes) {
          controller.abort();
          throw new OverpassResponseTooLargeError(bytesRead, maxBytes);
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof OverpassResponseTooLargeError) throw error;
      if (isTimeoutError(error)) throw new OverpassTimeoutError();
      throw error;
    }
    const combined = new Uint8Array(bytesRead);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    text = new TextDecoder().decode(combined);
  } else {
    // Environments without streaming bodies (e.g. mocked fetch in tests)
    text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new OverpassResponseTooLargeError(text.length, maxBytes);
    }
  }

  return parseOverpassBody(text);
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
