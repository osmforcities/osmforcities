import { describe, it, expect } from "vitest";
import type { Feature, Geometry } from "geojson";
import { computeGeometryMix } from "@/lib/dataset-geometry";

function feat(geometry: Geometry | null): Feature {
  return { type: "Feature", geometry: geometry as Geometry, properties: {} };
}

// A ~1 degree square near the equator: nonzero length and area.
const RING: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

describe("computeGeometryMix", () => {
  it("counts each geometry type, including Multi* variants", () => {
    const mix = computeGeometryMix([
      feat({ type: "Point", coordinates: [0, 0] }),
      feat({ type: "MultiPoint", coordinates: [[0, 0]] }),
      feat({ type: "LineString", coordinates: [[0, 0], [1, 1]] }),
      feat({ type: "MultiLineString", coordinates: [[[0, 0], [1, 1]]] }),
      feat({ type: "Polygon", coordinates: [RING] }),
      feat({ type: "MultiPolygon", coordinates: [[RING]] }),
    ]);
    expect(mix.total).toBe(6);
    expect(mix.points).toBe(2);
    expect(mix.lines).toBe(2);
    expect(mix.areas).toBe(2);
  });

  it("accumulates line length (km) and polygon area (km2)", () => {
    const mix = computeGeometryMix([
      feat({ type: "LineString", coordinates: [[0, 0], [1, 1]] }),
      feat({ type: "Polygon", coordinates: [RING] }),
    ]);
    expect(mix.lineKm).toBeGreaterThan(0);
    expect(mix.areaKm2).toBeGreaterThan(0);
  });

  it("skips malformed geometry without throwing", () => {
    const mix = computeGeometryMix([
      feat({ type: "LineString", coordinates: [] }),
      feat({ type: "Polygon", coordinates: [] }),
      feat(null),
    ]);
    // Types still classified; measures stay finite (0).
    expect(mix.lines).toBe(1);
    expect(mix.areas).toBe(1);
    expect(Number.isFinite(mix.lineKm)).toBe(true);
    expect(Number.isFinite(mix.areaKm2)).toBe(true);
  });

  it("returns all zeros for empty input", () => {
    expect(computeGeometryMix([])).toEqual({
      total: 0,
      points: 0,
      lines: 0,
      areas: 0,
      lineKm: 0,
      areaKm2: 0,
    });
  });
});
