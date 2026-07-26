import type { FeatureCollection } from "geojson";
import {
  executeOverpassQueryWithByteLimit,
  convertOverpassToGeoJSON,
  countOverpassElements,
  OverpassTimeoutError,
  OverpassResponseTooLargeError,
} from "@/lib/overpass/transport";
import type { OverpassData } from "@/types/overpass";
import { calculateBbox } from "@/lib/utils";
import { computeRecencyBands } from "@/lib/dataset-recency";
import { computeGeometryMix, type GeometryMix } from "@/lib/dataset-geometry";
import type { Bbox } from "@/types/geojson";
import { prisma } from "@/lib/db";
import {
  MAX_DATASET_BYTES,
  OVERPASS_BYTES_PER_ELEMENT_ESTIMATE,
  SIZE_CHECK_TTL_HOURS,
} from "@/lib/constants";

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class DatasetTooLargeError extends Error {
  constructor(public readonly bytes: number, estimated: boolean) {
    super(
      `Dataset too large: ${estimated ? "estimated " : ""}${formatMb(bytes)} of data (max ${formatMb(MAX_DATASET_BYTES)}). Try a smaller area.`
    );
    this.name = "DatasetTooLargeError";
  }
}

export class DatasetSizeCheckTimeoutError extends Error {
  constructor() {
    super("Dataset size check timed out. Please try again later.");
    this.name = "DatasetSizeCheckTimeoutError";
  }
}

type SizeCheckStatus = "ok" | "too_large" | "timeout";

async function recordSizeCheck(
  areaId: number,
  templateId: string,
  status: SizeCheckStatus,
  bytes: { estimatedBytes?: number; actualBytes?: number } = {}
): Promise<void> {
  const data = {
    status,
    estimatedBytes: bytes.estimatedBytes ?? null,
    actualBytes: bytes.actualBytes ?? null,
    checkedAt: new Date(),
  };
  await prisma.areaSizeCheck.upsert({
    where: { areaId_templateId: { areaId, templateId } },
    create: { areaId, templateId, ...data },
    update: data,
  });
}

/** Reject immediately if a fresh verdict already marked this area+template too large */
async function assertNoFreshNegativeVerdict(
  areaId: number,
  templateId: string
): Promise<void> {
  const check = await prisma.areaSizeCheck.findUnique({
    where: { areaId_templateId: { areaId, templateId } },
  });
  if (!check) return;

  const ttlMs = SIZE_CHECK_TTL_HOURS * 60 * 60 * 1000;
  if (Date.now() - check.checkedAt.getTime() > ttlMs) return;

  if (check.status === "too_large") {
    throw new DatasetTooLargeError(
      check.actualBytes ?? check.estimatedBytes ?? MAX_DATASET_BYTES,
      check.actualBytes === null
    );
  }
  if (check.status === "timeout") {
    throw new DatasetSizeCheckTimeoutError();
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
  // Set from the geojson in fetchDatasetSnapshot, not extractDatasetStats.
  editRecencyBands?: number[];
  mapperRecencyBands?: number[];
  geometryMix?: GeometryMix;
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
  rawQuery: string,
  templateId: string
): Promise<DatasetSnapshot> {
  const queryString = rawQuery.replace(
    /\{OSM_RELATION_ID\}/g,
    areaId.toString()
  );

  await assertNoFreshNegativeVerdict(areaId, templateId);

  // Cheap pre-flight: reject before Overpass serializes anything if the
  // estimated payload already exceeds the cap
  let estimatedBytes: number;
  try {
    const elementCount = await countOverpassElements(queryString);
    estimatedBytes = elementCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE;
  } catch (error) {
    if (error instanceof OverpassTimeoutError) {
      await recordSizeCheck(areaId, templateId, "timeout");
      throw new DatasetSizeCheckTimeoutError();
    }
    throw error;
  }
  if (estimatedBytes > MAX_DATASET_BYTES) {
    await recordSizeCheck(areaId, templateId, "too_large", { estimatedBytes });
    throw new DatasetTooLargeError(estimatedBytes, true);
  }

  let overpassData: OverpassData;
  try {
    overpassData = await executeOverpassQueryWithByteLimit(
      queryString,
      MAX_DATASET_BYTES
    );
  } catch (error) {
    if (error instanceof OverpassResponseTooLargeError) {
      await recordSizeCheck(areaId, templateId, "too_large", {
        estimatedBytes,
        actualBytes: error.bytesRead,
      });
      throw new DatasetTooLargeError(error.bytesRead, false);
    }
    if (error instanceof OverpassTimeoutError) {
      await recordSizeCheck(areaId, templateId, "timeout", { estimatedBytes });
      throw new DatasetSizeCheckTimeoutError();
    }
    throw error;
  }

  await recordSizeCheck(areaId, templateId, "ok", { estimatedBytes });
  const geojson = convertOverpassToGeoJSON(overpassData);
  const stats = extractDatasetStats(overpassData);
  // From geojson features, not raw Overpass elements, so the counts match the
  // panel's feature-based derivation.
  const { editRecencyBands, mapperRecencyBands } = computeRecencyBands(
    geojson.features
  );
  stats.editRecencyBands = editRecencyBands;
  stats.mapperRecencyBands = mapperRecencyBands;
  stats.geometryMix = computeGeometryMix(geojson.features);
  const bbox = calculateBbox(geojson);
  return {
    geojson,
    stats,
    bbox,
    dataCount: geojson.features.length,
  };
}
