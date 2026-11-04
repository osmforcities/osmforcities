/**
 * Client-side decision: does this dataset render from PMTiles?
 * Opt-in via NEXT_PUBLIC_TILES_ENABLED while #489 is being proven; unset (or
 * anything but "true") keeps the geojson path — the kill switch.
 */
export const TILES_ENABLED = process.env.NEXT_PUBLIC_TILES_ENABLED === "true";

/**
 * Path to the served archive, or null when the geojson path should render.
 * tilesServedJobId moves only when a bake lands (blue/green), so a pending or
 * failed rebuild keeps serving the previous archive. tilesState/tilesJobId
 * describe the bake in progress and play no part here.
 */
export function datasetTilesPath(dataset: {
  tilesServedJobId?: string | null;
}): string | null {
  if (!TILES_ENABLED || !dataset.tilesServedJobId) return null;
  return `/api/tiles/${dataset.tilesServedJobId}.pmtiles`;
}

/**
 * True while a dataset has never had a map: its first bake is pending or
 * failed. A rebuild keeps its served archive, and an empty count keeps the
 * empty screen.
 */
export function awaitsFirstMap(dataset: {
  dataCount: number;
  geojson: unknown;
  tilesServedJobId: string | null;
  tilesState: string | null;
}): boolean {
  return (
    dataset.dataCount !== 0 &&
    !dataset.geojson &&
    !dataset.tilesServedJobId &&
    (dataset.tilesState === "pending" || dataset.tilesState === "failed")
  );
}

/**
 * What a Sync click reports. A pending bake means the refresh only queued a
 * rebuild, so "fetched" stays put; anything else (including responses without
 * the field) is the synced path.
 */
export function refreshOutcome(result: {
  tilesState?: string | null;
  lastChecked?: Date;
}): { queued: true } | { queued: false; lastChecked: Date } {
  if (result.tilesState === "pending") return { queued: true };
  return { queued: false, lastChecked: result.lastChecked ?? new Date() };
}

/**
 * Can this payload be downloaded as geojson? hasGeojson covers tiles-render
 * payloads whose FeatureCollection was stripped (the export API reads the DB
 * row); older payload shapes without the field fall back to the inline data.
 */
export function hasDownloadableGeojson(dataset: {
  hasGeojson?: boolean;
  geojson?: unknown;
}): boolean {
  return dataset.hasGeojson ?? Boolean(dataset.geojson);
}
