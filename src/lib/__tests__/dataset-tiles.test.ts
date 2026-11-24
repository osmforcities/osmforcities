import { describe, it, expect } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  awaitsFirstMap,
  datasetTilesPath,
  hasDrawnTagsOnly,
  refreshOutcome,
  tilesPointCount,
} from "../dataset-tiles";
import { transformDataset } from "../dataset/transform";

describe("datasetTilesPath", () => {
  const served = { tilesState: "done", tilesServedJobId: "ds-1-3" };

  it("points at the served archive", () => {
    expect(datasetTilesPath(served)).toBe("/api/tiles/ds-1-3.pmtiles");
  });

  it("keeps serving the previous archive while a rebuild is pending or failed", () => {
    for (const tilesState of ["pending", "failed"]) {
      const rebuilding = { tilesState, tilesJobId: "ds-1-9", tilesServedJobId: "ds-1-3" };
      expect(datasetTilesPath(rebuilding)).toBe("/api/tiles/ds-1-3.pmtiles");
    }
  });

  it("is null until a first archive is served", () => {
    const firstBake = { tilesState: "pending", tilesJobId: "j", tilesServedJobId: null };
    const doneNotServed = { tilesState: "done", tilesJobId: "j", tilesServedJobId: null };
    expect(datasetTilesPath(firstBake)).toBeNull();
    expect(datasetTilesPath(doneNotServed)).toBeNull();
    expect(datasetTilesPath({})).toBeNull();
  });
});

describe("awaitsFirstMap", () => {
  const firstBake = {
    tilesServedJobId: null,
    tilesState: "pending",
  };

  it("holds while a dataset that never had a map bakes or has failed", () => {
    expect(awaitsFirstMap(firstBake)).toBe(true);
    expect(awaitsFirstMap({ ...firstBake, tilesState: "failed" })).toBe(true);
  });

  it("holds while the count probe runs", () => {
    expect(awaitsFirstMap({ ...firstBake, tilesState: "counting" })).toBe(true);
  });

  it("lets a rebuild keep its served archive", () => {
    expect(awaitsFirstMap({ ...firstBake, tilesServedJobId: "ds-1-3" })).toBe(false);
  });

  it("lets a row with no bake through", () => {
    expect(awaitsFirstMap({ ...firstBake, tilesState: null })).toBe(false);
  });
});

describe("refreshOutcome", () => {
  const lastChecked = new Date("2026-10-05T10:00:00Z");

  it("reports a queued update and no new fetched time when the bake is pending", () => {
    expect(refreshOutcome({ tilesState: "pending", lastChecked })).toEqual({
      queued: true,
    });
  });

  it("keeps the synced path with the response's fetched time otherwise", () => {
    expect(refreshOutcome({ tilesState: "done", lastChecked })).toEqual({
      queued: false,
      lastChecked,
    });
    expect(refreshOutcome({ lastChecked })).toEqual({ queued: false, lastChecked });
  });
});

describe("transformDataset geojson", () => {
  const geojson: FeatureCollection = { type: "FeatureCollection", features: [] };
  const raw = {
    id: "ds-1",
    cityName: "Berlin",
    isActive: true,
    lastChecked: null,
    dataCount: 0,
    stats: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    geojson,
    hasGeojson: true,
    bbox: null,
    tilesState: "done",
    tilesJobId: "ds-1-3",
    tilesServedJobId: "ds-1-3",
    template: {
      id: "tpl-1",
      name: "Schools",
      description: null,
      translations: [],
      category: { id: "cat-1", name: "Education", slug: "education" },
    },
    user: null,
    area: {
      id: 1,
      name: "Berlin",
      countryCode: "DE",
      bounds: null,
      geojson: null,
    },
  };

  it("never ships geojson to the page, but keeps hasGeojson for export", () => {
    for (const tilesServedJobId of ["ds-1-3", null]) {
      const dataset = transformDataset({ ...raw, tilesServedJobId }, null, "en");
      expect(dataset).not.toHaveProperty("geojson");
      expect(dataset.hasGeojson).toBe(true);
    }
  });

  it("reports no geojson for a tiles-only row", () => {
    const dataset = transformDataset({ ...raw, hasGeojson: false }, null, "en");
    expect(dataset.hasGeojson).toBe(false);
  });
});

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

describe("hasDrawnTagsOnly", () => {
  const archive = (maxzoom: number) => ({ type: "vector", maxzoom });

  it.each([9, 11.5, 13.9])("is true at z%s of a split archive", (zoom) => {
    expect(hasDrawnTagsOnly(zoom, archive(14))).toBe(true);
  });

  it.each([8.9, 14, 16])("is false at z%s, where tiles carry every tag", (zoom) => {
    expect(hasDrawnTagsOnly(zoom, archive(15))).toBe(false);
  });

  it("is false when the archive stops below z14 (no split)", () => {
    expect(hasDrawnTagsOnly(11, archive(13))).toBe(false);
  });

  it("is false for a geojson source", () => {
    expect(hasDrawnTagsOnly(11, { type: "geojson", maxzoom: 18 })).toBe(false);
  });

  it("is false without a source", () => {
    expect(hasDrawnTagsOnly(11, undefined)).toBe(false);
  });
});
