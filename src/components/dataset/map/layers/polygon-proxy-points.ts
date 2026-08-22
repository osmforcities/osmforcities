import type { Feature } from "geojson";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { PROXY_LAYER_ID } from "./layer-ids";
import { bbox } from "@turf/bbox";
import { centroid } from "@turf/centroid";

// Polygons smaller than this extent (~150m) are subpixel on city-wide
// views; they get a low-zoom circle proxy at their centroid
const SMALL_POLYGON_MAX_EXTENT_DEG = 0.0015;

export function createSmallPolygonProxyPoints(
  polygonFeatures: Feature[]
): Feature[] {
  return polygonFeatures
    .filter((feature) => {
      const [minX, minY, maxX, maxY] = bbox(feature);
      return (
        maxX - minX < SMALL_POLYGON_MAX_EXTENT_DEG &&
        maxY - minY < SMALL_POLYGON_MAX_EXTENT_DEG
      );
    })
    .map((feature) => ({
      ...feature,
      geometry: centroid(feature).geometry,
    }));
}

// A proxy hit comes back as the centroid Point; hand back the polygon it stands
// for, so the highlight draws the footprint and not a dot that outlives the fade.
export function resolveProxyFeature(
  hit: MapGeoJSONFeature,
  sourceFeatures: Feature[]
): Feature {
  if (hit.layer?.id !== PROXY_LAYER_ID) return hit;
  const id = hit.properties?.id;
  // Matching on undefined would pick the first id-less polygon
  if (id == null) return hit;
  return sourceFeatures.find((f) => f.properties?.id === id) ?? hit;
}
