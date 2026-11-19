import { VectorTile } from "@mapbox/vector-tile";
import type { Feature } from "geojson";
import Pbf from "pbf";
import type { PMTiles } from "pmtiles";
import { FULL_TAGS_ZOOM, TILES_SOURCE_LAYER } from "@/lib/dataset-tiles";

type Archive = Pick<PMTiles, "getZxy">;

export type TagSet = "full" | "loading" | "drawn";

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

// Half a grid step of the coarsest drawn-keys tiles (z9, 1024 units): a
// point rounded onto a z14 tile edge may sit in the tile on either side
const EDGE_SLACK_DEGREES = 0.0004;

function candidateTiles({ lng, lat }: { lng: number; lat: number }) {
  const tiles = [
    fullTagsTile(lng, lat),
    fullTagsTile(lng - EDGE_SLACK_DEGREES, lat),
    fullTagsTile(lng + EDGE_SLACK_DEGREES, lat),
    fullTagsTile(lng, lat - EDGE_SLACK_DEGREES),
    fullTagsTile(lng, lat + EDGE_SLACK_DEGREES),
  ];
  const seen = new Set<string>();
  return tiles.filter(({ x, y }) => {
    const key = `${x}/${y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findInTile(
  archive: Archive,
  { x, y }: { x: number; y: number },
  osmId: string
): Promise<Record<string, unknown> | null> {
  const tile = await archive.getZxy(FULL_TAGS_ZOOM, x, y);
  if (!tile) return null;
  const layer = new VectorTile(new Pbf(tile.data)).layers[TILES_SOURCE_LAYER];
  for (let i = 0; i < (layer?.length ?? 0); i++) {
    const { properties } = layer.feature(i);
    if (properties["@id"] === osmId) return properties;
  }
  return null;
}

// Null when no nearby tile holds the feature: a line clicked far across a
// tile edge, or a feature dropped from a dense tile
export async function readFullTags(
  archive: Archive,
  lngLat: { lng: number; lat: number },
  osmId: string
): Promise<Record<string, unknown> | null> {
  for (const tile of candidateTiles(lngLat)) {
    const tags = await findInTile(archive, tile, osmId);
    if (tags) return tags;
  }
  return null;
}

export async function withFullTags(
  feature: Feature,
  archive: Archive | null,
  lngLat: { lng: number; lat: number }
): Promise<Feature | null> {
  const osmId = feature.properties?.["@id"];
  if (!archive || typeof osmId !== "string") return null;
  // A circle takes clicks a radius away from its centre, which at z9 can be
  // the next z14 tile over
  const { geometry } = feature;
  const point =
    geometry.type === "Point"
      ? { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
      : lngLat;
  const tags = await readFullTags(archive, point, osmId).catch(() => null);
  if (!tags) return null;
  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: { ...tags, id: osmId },
  };
}
