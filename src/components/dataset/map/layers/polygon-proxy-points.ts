import type { Feature } from "geojson";
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
