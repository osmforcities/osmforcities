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
