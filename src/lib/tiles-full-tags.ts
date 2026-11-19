import { VectorTile } from "@mapbox/vector-tile";
import type { Feature } from "geojson";
import Pbf from "pbf";
import { FULL_TAGS_ZOOM, TILES_SOURCE_LAYER } from "@/lib/dataset-tiles";

type Archive = {
  getZxy(
    z: number,
    x: number,
    y: number
  ): Promise<{ data: ArrayBuffer } | undefined>;
};

export function fullTagsTile(lng: number, lat: number) {
  const n = 2 ** FULL_TAGS_ZOOM;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        n
    ),
  };
}

/**
 * The tags of one feature from the archive's z14 tile under a point. Null
 * when the tile lacks it: a line clicked across a tile edge, or a feature
 * dropped from a dense tile.
 */
export async function readFullTags(
  archive: Archive,
  lngLat: { lng: number; lat: number },
  osmId: string
): Promise<Record<string, unknown> | null> {
  const { x, y } = fullTagsTile(lngLat.lng, lngLat.lat);
  const tile = await archive.getZxy(FULL_TAGS_ZOOM, x, y);
  if (!tile) return null;
  const layer = new VectorTile(new Pbf(tile.data)).layers[TILES_SOURCE_LAYER];
  for (let i = 0; i < (layer?.length ?? 0); i++) {
    const { properties } = layer.feature(i);
    if (properties["@id"] === osmId) return properties;
  }
  return null;
}

/** The selected feature with the archive's full tags, or null to keep it. */
export async function withFullTags(
  feature: Feature,
  archive: Archive | null,
  lngLat: { lng: number; lat: number }
): Promise<Feature | null> {
  const osmId = feature.properties?.["@id"];
  if (!archive || typeof osmId !== "string") return null;
  const tags = await readFullTags(archive, lngLat, osmId).catch(() => null);
  if (!tags) return null;
  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: { ...tags, id: osmId },
  };
}
