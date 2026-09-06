import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { tilesDir } from "./client";
import { AGE_CATEGORY_ORDER } from "@/lib/feature-age";
import { MAX_DATASET_BYTES } from "@/lib/constants";

/**
 * Map the tiler's stats.json onto Dataset columns for tiles-only datasets
 * (the app never fetched the features, so the tiler is the stats source).
 * The two shapes were designed for parity (#487 phase 3): field names match
 * StoredDatasetStats; tiler-internal extras are dropped.
 */

type TilerStats = {
  schemaVersion: number;
  features: number;
  editorsCount: number;
  changesetsCount: number;
  elementVersionsCount: number;
  oldestElement: string | null;
  mostRecentElement: string | null;
  averageElementAge: number | null;
  averageElementVersion: number | null;
  recentActivity: {
    elementsEdited: number;
    changesets: number;
    editors: number;
  };
  qualityMetrics: Record<string, number>;
  editRecencyBands: number[];
  mapperRecencyBands: number[];
  tagCounts: Array<{ key: string; count: number }>;
  filterDimensions?: unknown[];
  // Present when the job was submitted with ageBandsDays: per-feature counts
  // in the app's legend buckets (AGE_LEGEND_BANDS_DAYS) plus "older".
  ageBands?: number[];
  geometryMix: Record<string, number>;
  bbox: number[] | null;
};

export async function readPulledStats(jobId: string): Promise<unknown> {
  const raw = await readFile(
    path.join(tilesDir(), `${jobId}.stats.json`),
    "utf8"
  );
  return JSON.parse(raw);
}

/**
 * Returns the spreadable Dataset update columns, or null when the stats are
 * unusable (unknown schemaVersion — "read it first and refuse what you don't
 * understand", per the tiler API contract).
 */
export function tilerStatsToDatasetColumns(raw: unknown) {
  const s = raw as TilerStats;
  if (!s || s.schemaVersion !== 1) {
    console.error(
      `Unusable tiler stats (schemaVersion ${s?.schemaVersion}); skipping stats fill`
    );
    return null;
  }
  // ageBands (per-feature counts in the legend's buckets, "older" last) map
  // onto the stored age dimension — same shape computeAgeDimension writes:
  // zero-count buckets omitted, missing always 0.
  const filterDimensions = [...(s.filterDimensions ?? [])];
  if (
    Array.isArray(s.ageBands) &&
    s.ageBands.length === AGE_CATEGORY_ORDER.length
  ) {
    filterDimensions.push({
      key: "age",
      kind: "age",
      missing: 0,
      values: AGE_CATEGORY_ORDER.map((value, index) => ({
        value,
        count: s.ageBands![index],
      })).filter((entry) => entry.count > 0),
    });
  }

  const stats = {
    editorsCount: s.editorsCount,
    elementVersionsCount: s.elementVersionsCount,
    changesetsCount: s.changesetsCount,
    oldestElement: s.oldestElement,
    mostRecentElement: s.mostRecentElement,
    averageElementAge: s.averageElementAge,
    averageElementVersion: s.averageElementVersion,
    recentActivity: s.recentActivity,
    qualityMetrics: s.qualityMetrics,
    editRecencyBands: s.editRecencyBands,
    mapperRecencyBands: s.mapperRecencyBands,
    tagCounts: s.tagCounts,
    filterDimensions,
    geometryMix: s.geometryMix,
  };
  return {
    stats: JSON.parse(JSON.stringify(stats)),
    dataCount: s.features,
    bbox: s.bbox ?? Prisma.JsonNull,
    lastEditedAt: s.mostRecentElement ? new Date(s.mostRecentElement) : null,
    contributorsCount: s.editorsCount,
    recentlyEditedCount: s.recentActivity?.elementsEdited ?? null,
  };
}

// Tiler ndjson convention (@-prefixed meta) → the app's stored flat shape
// (osmtogeojson flatProperties: unprefixed id/user/uid/timestamp/version/
// changeset alongside the raw tags).
const META_KEY_MAP: Record<string, string> = {
  "@id": "id",
  "@user": "user",
  "@uid": "uid",
  "@timestamp": "timestamp",
  "@version": "version",
  "@changeset": "changeset",
};

/**
 * Rebuild the stored-geojson FeatureCollection from a pulled data.ndjson
 * (jobs submitted with keepMeta). Returns null when the file is absent or
 * too large for the geojson column — callers then store JsonNull, exactly
 * the old over-cap behavior.
 */
export async function readPulledFeatures(jobId: string): Promise<{
  type: "FeatureCollection";
  features: unknown[];
} | null> {
  const filePath = path.join(tilesDir(), `${jobId}.ndjson`);
  try {
    // ndjson size ≈ the serialized collection (meta keys shrink by one char,
    // _ts drops) — a deterministic stand-in for the storage cap.
    if ((await stat(filePath)).size > MAX_DATASET_BYTES) return null;
  } catch {
    return null;
  }
  const raw = await readFile(filePath, "utf8");
  const features: unknown[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const feature = JSON.parse(line) as {
      id?: unknown;
      properties?: Record<string, unknown> | null;
    };
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(feature.properties ?? {})) {
      if (key === "_ts") continue; // client re-stamps at render time
      mapped[META_KEY_MAP[key] ?? key] = value;
    }
    feature.properties = mapped;
    if (mapped.id) feature.id = mapped.id; // app features carry it at both levels
    features.push(feature);
  }
  return { type: "FeatureCollection", features };
}
