import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { FeatureCollection } from "geojson";

// TILES_ENABLED is read from the env at module load, so every test stubs the
// flag first and imports the modules fresh.
async function loadWithFlag(enabled: boolean) {
  vi.stubEnv("NEXT_PUBLIC_TILES_ENABLED", enabled ? "true" : "");
  vi.resetModules();
  const tiles = await import("../dataset-tiles");
  const transform = await import("../dataset/transform");
  return { ...tiles, ...transform };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("datasetTilesPath", () => {
  const done = { tilesState: "done", tilesJobId: "ds-1-3" };

  it("is null when the flag is off, whatever the job state", async () => {
    const { datasetTilesPath } = await loadWithFlag(false);
    expect(datasetTilesPath(done)).toBeNull();
  });

  it("points at the pulled archive when the flag is on and the bake is done", async () => {
    const { datasetTilesPath } = await loadWithFlag(true);
    expect(datasetTilesPath(done)).toBe("/api/tiles/ds-1-3.pmtiles");
  });

  it("is null while a bake is pending, failed, or missing its job id", async () => {
    const { datasetTilesPath } = await loadWithFlag(true);
    expect(datasetTilesPath({ tilesState: "pending", tilesJobId: "j" })).toBeNull();
    expect(datasetTilesPath({ tilesState: "failed", tilesJobId: "j" })).toBeNull();
    expect(datasetTilesPath({ tilesState: "done", tilesJobId: null })).toBeNull();
    expect(datasetTilesPath({})).toBeNull();
  });
});

describe("transformDataset geojson stripping", () => {
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
    bbox: null,
    tilesState: "done",
    tilesJobId: "ds-1-3",
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

  it("keeps geojson in the payload when the flag is off", async () => {
    const { transformDataset } = await loadWithFlag(false);
    const dataset = transformDataset(raw, null, "en");
    expect(dataset.geojson).toEqual(geojson);
    expect(dataset.hasGeojson).toBe(true);
  });

  it("strips geojson but keeps hasGeojson when tiles render", async () => {
    const { transformDataset } = await loadWithFlag(true);
    const dataset = transformDataset(raw, null, "en");
    expect(dataset.geojson).toBeNull();
    expect(dataset.hasGeojson).toBe(true);
  });

  it("keeps geojson while the bake is still pending, even with the flag on", async () => {
    const { transformDataset } = await loadWithFlag(true);
    const dataset = transformDataset(
      { ...raw, tilesState: "pending" },
      null,
      "en"
    );
    expect(dataset.geojson).toEqual(geojson);
  });
});
