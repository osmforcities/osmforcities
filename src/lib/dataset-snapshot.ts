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
import { computeTagCounts, type TagCount } from "@/lib/dataset-tags";
import {
  computeFilterDimensions,
  type FilterDimension,
} from "@/lib/filter-dimensions";
import type { Bbox } from "@/types/geojson";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { LARGE_JOB_MAXSIZE_BYTES, tilerEnabled } from "@/lib/tiler/client";
import { TILES_ENABLED } from "@/lib/dataset-tiles";
import {
  MAX_DATASET_BYTES,
  OVERPASS_BYTES_PER_ELEMENT_ESTIMATE,
  SIZE_CHECK_TIMEOUT_TTL_MINUTES,
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

/**
 * Reject immediately if a fresh verdict already marked this area+template too
 * large or timed out. The two kinds age differently: too_large is stable, a
 * timeout is usually transient load.
 */
async function assertNoFreshNegativeVerdict(
  areaId: number,
  templateId: string
): Promise<void> {
  const check = await prisma.areaSizeCheck.findUnique({
    where: { areaId_templateId: { areaId, templateId } },
  });
  if (!check) return;

  const ttlMs =
    check.status === "timeout"
      ? SIZE_CHECK_TIMEOUT_TTL_MINUTES * 60 * 1000
      : SIZE_CHECK_TTL_HOURS * 60 * 60 * 1000;
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
  tagCounts?: TagCount[];
  // Legend dimensions for the template's filterableTags, so the map does not
  // have to walk every feature (and, under vector tiles, cannot). The age
  // dimension is stored too but the client recomputes it while it still holds
  // features — stored age counts freeze at snapshot time.
  // Every distinct value is kept, so a high-cardinality curated key stores a
  // long list. Bounded in practice by the curated allow-lists; cap with top-N
  // plus an "other" residual only if a stats blob actually gets fat.
  filterDimensions?: FilterDimension[];
}

/**
 * DatasetStats as stored in the Dataset.stats JSON column: Dates are ISO
 * strings (the JSON round-trip in snapshotDatasetColumns) and every field is
 * optional because legacy rows predate newer fields. Derived from DatasetStats
 * so the two shapes cannot drift. Read it via readStats in lib/dataset-stats.
 */
export type StoredDatasetStats = {
  [K in keyof DatasetStats]?: DatasetStats[K] extends Date | null
    ? string | null
    : DatasetStats[K];
};

export type DatasetSnapshot =
  | {
      tilesOnly?: false;
      geojson: FeatureCollection;
      stats: DatasetStats;
      bbox: Bbox | null;
      dataCount: number;
    }
  | {
      // Over-cap dataset routed to the tiler (the tiles-only lane): the app
      // never fetches the features; stats/bbox arrive when the archive is
      // pulled (reconcileDataset), geojson never does.
      tilesOnly: true;
      geojson: null;
      stats: null;
      bbox: null;
      // An element count (the probe's, or the one a mid-fetch overflow
      // implies), never a feature count: the tiler submit derives raised
      // budgets from it on the scale the pre-flight caps on.
      dataCount: number;
    };

/**
 * The Dataset row columns derived from a snapshot, spreadable into both
 * prisma.dataset.create and .update data. The JSON round-trips are required:
 * Prisma Json columns need the Dates inside the blobs serialized to ISO
 * strings (structuredClone would preserve them).
 */
export function snapshotDatasetColumns(snapshot: DatasetSnapshot) {
  if (snapshot.tilesOnly) {
    // Only what this snapshot knows. stats/bbox and their denormalized
    // columns belong to the tiler fill, which writes them only while null —
    // nulling them here would wipe them on every refresh until the next bake.
    // lastChecked must be written here: the tiler fill does not set it, and a
    // null lastChecked drops the row out of health freshness checks.
    return {
      geojson: Prisma.JsonNull,
      dataCount: snapshot.dataCount,
      lastChecked: new Date(),
    };
  }
  return {
    geojson: JSON.parse(JSON.stringify(snapshot.geojson)),
    bbox: snapshot.bbox ? JSON.parse(JSON.stringify(snapshot.bbox)) : null,
    stats: JSON.parse(JSON.stringify(snapshot.stats)),
    dataCount: snapshot.dataCount,
    lastChecked: new Date(),
    lastEditedAt: snapshot.stats.mostRecentElement ?? null,
    contributorsCount: snapshot.stats.editorsCount,
    recentlyEditedCount: snapshot.stats.recentActivity.elementsEdited,
  };
}

function tilesOnlySnapshot(dataCount: number): DatasetSnapshot {
  return { tilesOnly: true, geojson: null, stats: null, bbox: null, dataCount };
}

// A timed-out count probe gets one retry on raised budgets while the lane is
// on: metro-class counts outgrow the template's default timeout and memory,
// and the first query against an area Overpass has not evaluated yet is slow
// even when the result is small. Measured probe costs live in
// docs/features/large-datasets.md.
// Overpass [timeout:N], in seconds.
const PROBE_RETRY_TIMEOUT_SECONDS = 180;
// Client-side abort, in milliseconds. Longer than the server budget so
// Overpass reports its own timeout before we hang up.
const PROBE_RETRY_CLIENT_TIMEOUT_MS = 200_000;

function withRaisedProbeBudgets(query: string): string {
  const settings = `[timeout:${PROBE_RETRY_TIMEOUT_SECONDS}][maxsize:${LARGE_JOB_MAXSIZE_BYTES}]`;
  return /\[timeout:\d+\]/.test(query)
    ? query.replace(/\[timeout:\d+\]/, settings)
    : query.replace("[out:json]", `[out:json]${settings}`);
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

/**
 * Read the template's curated filterable tags here rather than threading them
 * through all four callers, each of which would then have to keep its own
 * template `select` in sync. Missing template (or none curated) yields an
 * age-only dimension list.
 */
async function templateFilterableTags(templateId: string): Promise<string[]> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { filterableTags: true },
  });
  return template?.filterableTags ?? [];
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

  // With the lane on, over-cap is a routing decision (tiles-only), not a
  // refusal — so a cached too_large verdict must not block the count probe,
  // and no too_large verdict is recorded when the lane takes over. Both flags:
  // the tiler bakes the archive, but a row without geojson is only viewable
  // when the map renders tiles.
  const tilesLane = tilerEnabled() && TILES_ENABLED;

  try {
    await assertNoFreshNegativeVerdict(areaId, templateId);
  } catch (error) {
    if (!(tilesLane && error instanceof DatasetTooLargeError)) throw error;
  }

  // Cheap pre-flight: reject before Overpass serializes anything if the
  // estimated payload already exceeds the cap
  let elementCount: number;
  try {
    elementCount = await countOverpassElements(queryString);
  } catch (error) {
    if (!(error instanceof OverpassTimeoutError)) throw error;
    if (!tilesLane) {
      await recordSizeCheck(areaId, templateId, "timeout");
      throw new DatasetSizeCheckTimeoutError();
    }
    try {
      elementCount = await countOverpassElements(
        withRaisedProbeBudgets(queryString),
        PROBE_RETRY_CLIENT_TIMEOUT_MS
      );
    } catch (retryError) {
      if (!(retryError instanceof OverpassTimeoutError)) throw retryError;
      await recordSizeCheck(areaId, templateId, "timeout");
      throw new DatasetSizeCheckTimeoutError();
    }
  }
  const estimatedBytes = elementCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE;
  if (estimatedBytes > MAX_DATASET_BYTES) {
    if (tilesLane) return tilesOnlySnapshot(elementCount);
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
      // Estimate said under, actual said over: same routing decision. The
      // probe count alone would read as under-cap and send the bake out on
      // default budgets, so lift it to the element count the bytes imply.
      if (tilesLane) {
        return tilesOnlySnapshot(
          Math.max(
            elementCount,
            Math.ceil(error.bytesRead / OVERPASS_BYTES_PER_ELEMENT_ESTIMATE)
          )
        );
      }
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
  stats.tagCounts = computeTagCounts(geojson.features);
  stats.filterDimensions = computeFilterDimensions(
    geojson.features,
    await templateFilterableTags(templateId),
    // Curated keys: a 100%-Missing dimension is the finding, not noise —
    // matches how the map calls this (full-map.tsx).
    { keepEmpty: true }
  );
  const bbox = calculateBbox(geojson);
  return {
    geojson,
    stats,
    bbox,
    dataCount: geojson.features.length,
  };
}
