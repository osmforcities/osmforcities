import { readFile } from "node:fs/promises";
import path from "node:path";
import { tilesDir } from "./client";

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
    filterDimensions: s.filterDimensions,
    geometryMix: s.geometryMix,
  };
  return {
    stats: JSON.parse(JSON.stringify(stats)),
    dataCount: s.features,
    bbox: s.bbox ?? null,
    lastEditedAt: s.mostRecentElement ? new Date(s.mostRecentElement) : null,
    contributorsCount: s.editorsCount,
    recentlyEditedCount: s.recentActivity?.elementsEdited ?? null,
  };
}
