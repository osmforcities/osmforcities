/**
 * Geometry mix: how a dataset's features split across point / line / area, with
 * the total length of lines and total area of polygons. Defined in one place so
 * the server and the dataset panel classify and measure identically.
 *
 * The server precomputes each dataset's mix from its geojson and persists it in
 * `Dataset.stats` (dataset-snapshot.ts); the panel renders the stored mix only.
 * Turf area/length runs once at snapshot time instead of on every render.
 */
import area from "@turf/area";
import length from "@turf/length";
import type { Feature } from "geojson";

export interface GeometryMix {
  points: number;
  lines: number;
  areas: number;
  lineKm: number;
  areaKm2: number;
}

export function computeGeometryMix(features: Feature[]): GeometryMix {
  let points = 0;
  let lines = 0;
  let areas = 0;
  let lineKm = 0;
  let areaKm2 = 0;

  for (const f of features) {
    const geomType = f.geometry?.type;
    if (geomType === "Point" || geomType === "MultiPoint") {
      points++;
    } else if (geomType === "LineString" || geomType === "MultiLineString") {
      lines++;
      try {
        lineKm += length(f);
      } catch {
        /* skip malformed geometry */
      }
    } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
      areas++;
      try {
        areaKm2 += area(f) / 1_000_000;
      } catch {
        /* skip malformed geometry */
      }
    }
  }

  return { points, lines, areas, lineKm, areaKm2 };
}
