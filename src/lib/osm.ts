import osmtogeojson from "osmtogeojson";
import { FeatureCollection } from "geojson";
import {
  OverpassResponseSchema,
  OverpassErrorSchema,
  type OverpassResponse,
  type OverpassData,
} from "@/types/overpass";
import { OSMElementSchema, type OSMRelation } from "@/types/osm";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

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

  const validationResult = OverpassResponseSchema.safeParse(data);

  if (!validationResult.success) {
    console.error("Invalid Overpass response:", validationResult.error);
    return null;
  }

  const rel = validationResult.data.elements?.[0] as OSMRelation;

  if (!rel || rel.type !== "relation") return null;

  const geojson = convertOverpassToGeoJSON(validationResult.data);

  return {
    name: rel.tags?.name || `Relation ${relationId}`,
    countryCode: rel.tags?.["ISO3166-1"] || null,
    bounds: rel.bounds
      ? `${rel.bounds.minlat},${rel.bounds.minlon},${rel.bounds.maxlat},${rel.bounds.maxlon}`
      : null,
    geojson: rel,
    convertedGeojson: geojson,
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

  const errorValidation = OverpassErrorSchema.safeParse(data);
  if (errorValidation.success) {
    throw new Error(
      `Overpass API error: ${errorValidation.data.error.message}`
    );
  }

  return data as OverpassResponse;
}

export function convertOverpassToGeoJSON(
  overpassData: OverpassData
): FeatureCollection {
  if (!overpassData.elements || !Array.isArray(overpassData.elements)) {
    return {
      type: "FeatureCollection",
      features: [],
    };
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
      return {
        type: "FeatureCollection",
        features: [],
      };
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
    return {
      type: "FeatureCollection",
      features: [],
    };
  }
}

export interface DatasetStats {
  editorsCount: number;
  elementVersionsCount: number;
  changesetsCount: number;
  oldestElement: Date | null;
  mostRecentElement: Date | null;
  averageElementAge: number | null;
  averageElementVersion: number | null;
}

export function extractDatasetStats(overpassData: OverpassData): DatasetStats {
  if (!overpassData.elements || !Array.isArray(overpassData.elements)) {
    return {
      editorsCount: 0,
      elementVersionsCount: 0,
      changesetsCount: 0,
      oldestElement: null,
      mostRecentElement: null,
      averageElementAge: null,
      averageElementVersion: null,
    };
  }

  const editors = new Set<string>();
  const changesets = new Set<number>();
  let totalVersions = 0;
  let oldestTimestamp: Date | null = null;
  let mostRecentTimestamp: Date | null = null;
  let totalAge = 0;
  let elementsWithAge = 0;

  for (const element of overpassData.elements) {
    if (element.user) {
      editors.add(element.user);
    }

    if (element.version) {
      totalVersions += element.version;
    }

    if (element.changeset) {
      changesets.add(element.changeset);
    }

    if (element.timestamp) {
      const elementDate = new Date(element.timestamp);

      if (!oldestTimestamp || elementDate < oldestTimestamp) {
        oldestTimestamp = elementDate;
      }

      if (!mostRecentTimestamp || elementDate > mostRecentTimestamp) {
        mostRecentTimestamp = elementDate;
      }

      const ageInDays =
        (Date.now() - elementDate.getTime()) / (1000 * 60 * 60 * 24);
      totalAge += ageInDays;
      elementsWithAge++;
    }
  }

  const averageElementAge =
    elementsWithAge > 0 ? totalAge / elementsWithAge : null;
  const averageElementVersion =
    overpassData.elements.length > 0
      ? totalVersions / overpassData.elements.length
      : null;

  return {
    editorsCount: editors.size,
    elementVersionsCount: totalVersions,
    changesetsCount: changesets.size,
    oldestElement: oldestTimestamp,
    mostRecentElement: mostRecentTimestamp,
    averageElementAge,
    averageElementVersion,
  };
}

export type { OSMNode, OSMWay, OSMRelation, OSMElement } from "@/types/osm";
export type {
  OverpassResponse,
  OverpassError,
  OverpassData,
} from "@/types/overpass";
