import { describe, it, expect, afterEach, vi } from "vitest";
import type { FilterDimension } from "../filter-dimensions";

// TILES_ENABLED is read from the env at module load, so every test stubs the
// flag first and imports the module fresh.
async function loadWithFlag(enabled: boolean) {
  vi.stubEnv("NEXT_PUBLIC_TILES_ENABLED", enabled ? "true" : "");
  vi.resetModules();
  return import("../featured-hero");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

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
  it("picks any featured row with data when tiles are off", async () => {
    const { featuredHeroWhere } = await loadWithFlag(false);
    expect(featuredHeroWhere()).toEqual({
      isFeatured: true,
      dataCount: { gt: 0 },
    });
  });

  it("picks only featured rows with a served archive when tiles are on", async () => {
    const { featuredHeroWhere } = await loadWithFlag(true);
    expect(featuredHeroWhere()).toEqual({
      isFeatured: true,
      dataCount: { gt: 0 },
      tilesServedJobId: { not: null },
    });
  });
});

describe("heroTiles", () => {
  it("is null when tiles are off, so the hero draws the geojson", async () => {
    const { heroTiles } = await loadWithFlag(false);
    expect(heroTiles(servedRow)).toBeNull();
  });

  it("is null for a row with no served archive", async () => {
    const { heroTiles } = await loadWithFlag(true);
    expect(heroTiles({ ...servedRow, tilesServedJobId: null })).toBeNull();
  });

  it("points at the served archive with the stored point count, bbox and dimensions", async () => {
    const { heroTiles } = await loadWithFlag(true);
    expect(heroTiles(servedRow)).toEqual({
      url: "pmtiles:///api/tiles/ds-1-3.pmtiles",
      pointCount: 12,
      bbox: [4.7, 52.2, 5.1, 52.5],
      filterDimensions: [surfaceDimension, lanesDimension],
    });
  });

  it("falls back to dataCount and no dimensions when stats are missing", async () => {
    const { heroTiles } = await loadWithFlag(true);
    expect(heroTiles({ ...servedRow, stats: null })).toMatchObject({
      pointCount: 500,
      filterDimensions: [],
    });
  });

  it("drops a malformed stored bbox", async () => {
    const { heroTiles } = await loadWithFlag(true);
    expect(heroTiles({ ...servedRow, bbox: [1, 2] })?.bbox).toBeNull();
    expect(heroTiles({ ...servedRow, bbox: null })?.bbox).toBeNull();
  });
});
