import type { GeometryMix } from "@/schemas/dataset";

// The tiler bakes everything into one layer named "features" (overpass-pmtiler API.md).
export const TILES_SOURCE_LAYER = "features";

/**
 * Path to the served archive, or null when the dataset has no map yet.
 * tilesServedJobId moves only when a bake lands (blue/green), so a pending or
 * failed rebuild keeps serving the previous archive. tilesState/tilesJobId
 * describe the bake in progress and play no part here.
 */
export function datasetTilesPath(dataset: {
  tilesServedJobId?: string | null;
}): string | null {
  if (!dataset.tilesServedJobId) return null;
  return `/api/tiles/${dataset.tilesServedJobId}.pmtiles`;
}

// The page holds no features to count, so the stored point count stands in.
export function tilesPointCount(dataset: {
  dataCount: number;
  stats: { geometryMix?: Pick<GeometryMix, "points"> } | null;
}): number {
  return dataset.stats?.geometryMix?.points ?? dataset.dataCount;
}

/**
 * True while a dataset has never had a map: its count probe is running, or
 * its first bake is pending or failed. A rebuild keeps its served archive.
 * An empty count never reaches a bake, so no count check is needed here.
 */
export function awaitsFirstMap(dataset: {
  tilesServedJobId: string | null;
  tilesState: string | null;
}): boolean {
  if (dataset.tilesState === "counting") return true;
  return (
    !dataset.tilesServedJobId &&
    (dataset.tilesState === "pending" || dataset.tilesState === "failed")
  );
}

// Mirrors the tiler's split bake: an archive reaching z14 keeps only the drawn
// keys (filterableTags, _ts, @id) at z9-z13.
const PARTIAL_TAGS_MIN_ZOOM = 9;
export const FULL_TAGS_ZOOM = 14;

export function hasDrawnTagsOnly(
  zoom: number,
  source: { type: string; maxzoom: number } | undefined
): boolean {
  if (source?.type !== "vector" || source.maxzoom < FULL_TAGS_ZOOM) return false;
  const tileZoom = Math.floor(zoom);
  return tileZoom >= PARTIAL_TAGS_MIN_ZOOM && tileZoom < FULL_TAGS_ZOOM;
}
