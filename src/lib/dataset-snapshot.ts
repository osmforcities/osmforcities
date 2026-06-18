import type { FeatureCollection } from "geojson";
import {
  executeOverpassQuery,
  convertOverpassToGeoJSON,
  countOverpassElements,
} from "@/lib/overpass/transport";
import type { OverpassData } from "@/types/overpass";
import { calculateBbox } from "@/lib/utils";
import type { Bbox } from "@/types/geojson";
import { MAX_DATASET_ELEMENTS } from "@/lib/constants";

export class DatasetTooLargeError extends Error {
  constructor(public readonly count: number) {
    super(
      `Dataset too large: ${count.toLocaleString()} elements (max ${MAX_DATASET_ELEMENTS.toLocaleString()}). Try a smaller area.`
    );
    this.name = "DatasetTooLargeError";
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
  recentActivity: {
    elementsEdited: number;
    changesets: number;
    editors: number;
  };
  qualityMetrics: {
    staleElementsCount: number;
    recentlyUpdatedElementsCount: number;
    staleElementsPercentage: number;
    recentlyUpdatedElementsPercentage: number;
  };
}

export interface DatasetSnapshot {
  geojson: FeatureCollection;
  stats: DatasetStats;
  bbox: Bbox | null;
  dataCount: number;
}

function extractDatasetStats(overpassData: OverpassData): DatasetStats {
  if (!overpassData.elements || !Array.isArray(overpassData.elements)) {
    return {
      editorsCount: 0,
      elementVersionsCount: 0,
      changesetsCount: 0,
      oldestElement: null,
      mostRecentElement: null,
      averageElementAge: null,
      averageElementVersion: null,
      recentActivity: { elementsEdited: 0, changesets: 0, editors: 0 },
      qualityMetrics: {
        staleElementsCount: 0,
        recentlyUpdatedElementsCount: 0,
        staleElementsPercentage: 0,
        recentlyUpdatedElementsPercentage: 0,
      },
    };
  }

  const editors = new Set<string>();
  const changesets = new Set<number>();
  let totalVersions = 0;
  let oldestTimestamp: Date | null = null;
  let mostRecentTimestamp: Date | null = null;
  let totalAge = 0;
  let elementsWithAge = 0;

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(
    now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
  );
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const recentEditors = new Set<string>();
  const recentChangesets = new Set<number>();
  let elementsEdited3m = 0;
  let staleElementsCount = 0;
  let recentlyUpdatedElementsCount = 0;

  for (const element of overpassData.elements) {
    if (element.user) editors.add(element.user);
    if (element.version) totalVersions += element.version;
    if (element.changeset) changesets.add(element.changeset);

    if (element.timestamp) {
      const elementDate = new Date(element.timestamp);

      if (!oldestTimestamp || elementDate < oldestTimestamp)
        oldestTimestamp = elementDate;
      if (!mostRecentTimestamp || elementDate > mostRecentTimestamp)
        mostRecentTimestamp = elementDate;

      const ageInDays =
        (Date.now() - elementDate.getTime()) / (1000 * 60 * 60 * 24);
      totalAge += ageInDays;
      elementsWithAge++;

      if (elementDate >= threeMonthsAgo) {
        elementsEdited3m++;
        if (element.user) recentEditors.add(element.user);
        if (element.changeset) recentChangesets.add(element.changeset);
      }

      if (elementDate < twoYearsAgo) staleElementsCount++;
      if (elementDate >= oneYearAgo) recentlyUpdatedElementsCount++;
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
    recentActivity: {
      elementsEdited: elementsEdited3m,
      changesets: recentChangesets.size,
      editors: recentEditors.size,
    },
    qualityMetrics: {
      staleElementsCount,
      recentlyUpdatedElementsCount,
      staleElementsPercentage:
        overpassData.elements.length > 0
          ? (staleElementsCount / overpassData.elements.length) * 100
          : 0,
      recentlyUpdatedElementsPercentage:
        overpassData.elements.length > 0
          ? (recentlyUpdatedElementsCount / overpassData.elements.length) * 100
          : 0,
    },
  };
}

export async function fetchDatasetSnapshot(
  areaId: number,
  rawQuery: string
): Promise<DatasetSnapshot> {
  const queryString = rawQuery.replace(
    /\{OSM_RELATION_ID\}/g,
    areaId.toString()
  );

  const elementCount = await countOverpassElements(queryString);
  if (elementCount > MAX_DATASET_ELEMENTS) {
    throw new DatasetTooLargeError(elementCount);
  }

  const overpassData = await executeOverpassQuery(queryString);
  const geojson = convertOverpassToGeoJSON(overpassData);
  const stats = extractDatasetStats(overpassData);
  const bbox = calculateBbox(geojson);
  return {
    geojson,
    stats,
    bbox,
    dataCount: geojson.features.length,
  };
}
