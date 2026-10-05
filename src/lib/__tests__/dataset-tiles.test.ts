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
  const served = { tilesState: "done", tilesServedJobId: "ds-1-3" };

  it("is null when the flag is off, whatever the job state", async () => {
    const { datasetTilesPath } = await loadWithFlag(false);
    expect(datasetTilesPath(served)).toBeNull();
  });

  it("points at the served archive when the flag is on", async () => {
    const { datasetTilesPath } = await loadWithFlag(true);
    expect(datasetTilesPath(served)).toBe("/api/tiles/ds-1-3.pmtiles");
  });

  it("keeps serving the previous archive while a rebuild is pending or failed", async () => {
    const { datasetTilesPath } = await loadWithFlag(true);
    for (const tilesState of ["pending", "failed"]) {
      const rebuilding = { tilesState, tilesJobId: "ds-1-9", tilesServedJobId: "ds-1-3" };
      expect(datasetTilesPath(rebuilding)).toBe("/api/tiles/ds-1-3.pmtiles");
    }
  });

  it("is null until a first archive is served", async () => {
    const { datasetTilesPath } = await loadWithFlag(true);
    const firstBake = { tilesState: "pending", tilesJobId: "j", tilesServedJobId: null };
    const doneNotServed = { tilesState: "done", tilesJobId: "j", tilesServedJobId: null };
    expect(datasetTilesPath(firstBake)).toBeNull();
    expect(datasetTilesPath(doneNotServed)).toBeNull();
    expect(datasetTilesPath({})).toBeNull();
  });
});

describe("refreshOutcome", () => {
  const lastChecked = new Date("2026-10-05T10:00:00Z");

  it("reports a queued update and no new fetched time when the bake is pending", async () => {
    const { refreshOutcome } = await loadWithFlag(true);
    expect(refreshOutcome({ tilesState: "pending", lastChecked })).toEqual({
      queued: true,
    });
  });

  it("keeps the synced path with the response's fetched time otherwise", async () => {
    const { refreshOutcome } = await loadWithFlag(true);
    expect(refreshOutcome({ tilesState: "done", lastChecked })).toEqual({
      queued: false,
      lastChecked,
    });
    expect(refreshOutcome({ lastChecked })).toEqual({ queued: false, lastChecked });
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

  it("keeps stripping while a rebuild is pending over a served archive", async () => {
    const { transformDataset } = await loadWithFlag(true);
    const dataset = transformDataset(
      { ...raw, tilesState: "pending", tilesJobId: "ds-1-9" },
      null,
      "en"
    );
    expect(dataset.geojson).toBeNull();
  });

  it("keeps geojson while the first bake is still pending, even with the flag on", async () => {
    const { transformDataset } = await loadWithFlag(true);
    const dataset = transformDataset(
      { ...raw, tilesState: "pending", tilesServedJobId: null },
      null,
      "en"
    );
    expect(dataset.geojson).toEqual(geojson);
  });
});
