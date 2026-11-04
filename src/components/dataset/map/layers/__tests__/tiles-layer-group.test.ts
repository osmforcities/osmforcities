import { describe, it, expect } from "vitest";
import { tilesPointCount } from "../tiles-layer-group";

describe("tilesPointCount", () => {
  it("sizes points from the stored point count of a mixed dataset", () => {
    const dataset = {
      dataCount: 500,
      stats: {
        geometryMix: { points: 12, lines: 0, areas: 488, lineKm: 0, areaKm2: 3 },
      },
    };
    expect(tilesPointCount(dataset)).toBe(12);
  });

  it("falls back to dataCount when stats lack geometryMix", () => {
    expect(tilesPointCount({ dataCount: 500, stats: {} })).toBe(500);
    expect(tilesPointCount({ dataCount: 500, stats: null })).toBe(500);
  });
});
