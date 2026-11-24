import { describe, it, expect } from "vitest";
import { featuredHeroWhere, heroTiles } from "../featured-hero";
import type { FilterDimension } from "../filter-dimensions";

const surfaceDimension: FilterDimension = {
  kind: "tag",
  key: "surface",
  values: [{ value: "asphalt", count: 10 }],
  missing: 2,
};
const lanesDimension: FilterDimension = {
  kind: "tag",
  key: "lanes",
  values: [{ value: "2", count: 4 }],
  missing: 0,
};

const servedRow = {
  tilesServedJobId: "ds-1-3",
  dataCount: 500,
  bbox: [4.7, 52.2, 5.1, 52.5],
  stats: {
    geometryMix: { points: 12, lines: 0, areas: 488, lineKm: 0, areaKm2: 3 },
    filterDimensions: [surfaceDimension, lanesDimension],
  },
};

describe("featuredHeroWhere", () => {
  it("picks only featured rows with a served archive", () => {
    expect(featuredHeroWhere()).toEqual({
      isFeatured: true,
      dataCount: { gt: 0 },
      tilesServedJobId: { not: null },
    });
  });
});

describe("heroTiles", () => {
  it("is null for a row with no served archive", () => {
    expect(heroTiles({ ...servedRow, tilesServedJobId: null })).toBeNull();
  });

  it("points at the served archive with the stored point count, bbox and dimensions", () => {
    expect(heroTiles(servedRow)).toEqual({
      url: "pmtiles:///api/tiles/ds-1-3.pmtiles",
      pointCount: 12,
      bbox: [4.7, 52.2, 5.1, 52.5],
      filterDimensions: [surfaceDimension, lanesDimension],
    });
  });

  it("falls back to dataCount and no dimensions when stats are missing", () => {
    expect(heroTiles({ ...servedRow, stats: null })).toMatchObject({
      pointCount: 500,
      filterDimensions: [],
    });
  });

  it("drops a malformed stored bbox", () => {
    expect(heroTiles({ ...servedRow, bbox: [1, 2] })?.bbox).toBeNull();
    expect(heroTiles({ ...servedRow, bbox: null })?.bbox).toBeNull();
  });
});
