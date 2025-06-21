import { FeatureCollection } from "geojson";
import osmtogeojson from "osmtogeojson";

// OSM element types for Overpass API
export interface OSMNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
  timestamp?: string;
  version?: number;
  changeset?: number;
  user?: string;
  uid?: number;
}

export interface OSMWay {
  type: "way";
  id: number;
  nodes: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
  timestamp?: string;
  version?: number;
  changeset?: number;
  user?: string;
  uid?: number;
}

export interface OSMRelation {
  type: "relation";
  id: number;
  members: Array<{
    type: "node" | "way" | "relation";
    ref: number;
    role: string;
  }>;
  geometry?: Array<Array<{ lat: number; lon: number }>>;
  tags?: Record<string, string>;
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  timestamp?: string;
  version?: number;
  changeset?: number;
  user?: string;
  uid?: number;
}

export type OSMElement = OSMNode | OSMWay | OSMRelation;

interface OverpassResponse {
  elements: OSMElement[];
  rawData?: unknown;
}

interface OverpassData {
  elements: OSMElement[];
}

export async function fetchOsmRelationData(relationId: number) {
  const query = `
    [out:json][timeout:25];
    rel(${relationId});
    out bb tags;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return null;

  const data = await res.json();
  const rel = data.elements?.[0] as OSMRelation;

  if (!rel || rel.type !== "relation") return null;

  return {
    name: rel.tags?.name || `Relation ${relationId}`,
    countryCode: rel.tags?.["ISO3166-1"] || null,
    bounds: rel.bounds
      ? `${rel.bounds.minlat},${rel.bounds.minlon},${rel.bounds.maxlat},${rel.bounds.maxlon}`
      : null,
    geojson: rel,
  };
}

export async function executeOverpassQuery(
  queryString: string
): Promise<OverpassResponse> {
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(queryString)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    elements: data.elements || [],
    rawData: data,
  };
}

// Convert Overpass API response to GeoJSON format using osmtogeojson library
export function convertOverpassToGeoJSON(
  overpassData: OverpassData
): FeatureCollection {
  if (!overpassData.elements || !Array.isArray(overpassData.elements)) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return osmtogeojson(overpassData);
}
