/**
 * Client-side decision: does this dataset render from PMTiles?
 * Opt-in via NEXT_PUBLIC_TILES_ENABLED while #489 is being proven; unset (or
 * anything but "true") keeps the geojson path — the kill switch.
 */
export const TILES_ENABLED = process.env.NEXT_PUBLIC_TILES_ENABLED === "true";

type TilesFields = {
  tilesServedJobId?: string | null;
};

/**
 * Path to the SERVED archive, or null when the geojson path should render.
 * tilesServedJobId moves only at reconcile-done (blue/green): during a
 * refresh bake it still points at the previous archive, so the map never
 * blanks while a new snapshot builds. tilesState/tilesJobId describe the
 * job being BUILT and play no part in serving.
 */
export function datasetTilesPath(dataset: TilesFields): string | null {
  if (!TILES_ENABLED) return null;
  if (!dataset.tilesServedJobId) return null;
  return `/api/tiles/${dataset.tilesServedJobId}.pmtiles`;
}
