/**
 * Client-side decision: does this dataset render from PMTiles?
 * Opt-in via NEXT_PUBLIC_TILES_ENABLED while #489 is being proven; unset (or
 * anything but "true") keeps the geojson path — the kill switch.
 */
export const TILES_ENABLED = process.env.NEXT_PUBLIC_TILES_ENABLED === "true";

type TilesFields = {
  tilesState?: string | null;
  tilesJobId?: string | null;
};

/** Path to the pulled archive, or null when the geojson path should render. */
export function datasetTilesPath(dataset: TilesFields): string | null {
  if (!TILES_ENABLED) return null;
  if (dataset.tilesState !== "done" || !dataset.tilesJobId) return null;
  return `/api/tiles/${dataset.tilesJobId}.pmtiles`;
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
