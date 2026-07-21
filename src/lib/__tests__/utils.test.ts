import { describe, it, expect } from "vitest";
import { isSmallAreaBounds, computeInitialViewState } from "@/lib/utils";
import type { Bbox } from "@/types/geojson";

// GeoJSON bbox order: [minLon, minLat, maxLon, maxLat]
const smallTownBbox: Bbox = [-9.2, 38.69, -9.1, 38.79]; // ~0.1 deg span
const tokyoBbox: Bbox = [135.0, 20.2, 154.2, 35.9]; // includes Ogasawara islands

// DB bounds string order: "minLat,minLon,maxLat,maxLon"
const smallTownBounds = "38.69,-9.2,38.79,-9.1";
const tokyoBounds = "20.2,135.0,35.9,154.2";

describe("isSmallAreaBounds", () => {
  it("accepts a small town bbox", () => {
    expect(isSmallAreaBounds(smallTownBbox)).toBe(true);
  });

  it("rejects a Tokyo-scale scattered bbox", () => {
    expect(isSmallAreaBounds(tokyoBbox)).toBe(false);
  });

  it("accepts a bbox exactly at the threshold", () => {
    expect(isSmallAreaBounds([10.0, 0.0, 10.25, 0.25])).toBe(true);
  });

  it("rejects a bbox just over the threshold", () => {
    expect(isSmallAreaBounds([10.0, 0.0, 10.3, 0.3])).toBe(false);
  });

  it("corrects longitude span at high latitude", () => {
    // 0.4 deg of longitude at 70N is ~15 km — small despite the raw span
    expect(isSmallAreaBounds([20.0, 69.9, 20.4, 70.1])).toBe(true);
  });
});

describe("computeInitialViewState", () => {
  it("fits bounds for a small area even when a center exists", () => {
    const view = computeInitialViewState(
      { bounds: smallTownBounds, centerLat: 38.74, centerLon: -9.15 },
      null
    );

    expect(view).toEqual({
      bounds: [-9.2, 38.69, -9.1, 38.79],
      fitBoundsOptions: { padding: 20 },
    });
  });

  it("centers at fixed zoom for a large area with a center", () => {
    const view = computeInitialViewState(
      { bounds: tokyoBounds, centerLat: 35.6768601, centerLon: 139.7638947 },
      null
    );

    expect(view).toEqual({
      longitude: 139.7638947,
      latitude: 35.6768601,
      zoom: 12,
    });
  });

  it("centers when the center lies inside the data bounds", () => {
    const dataBounds: Bbox = [139.5, 35.4, 140.0, 35.9];
    const view = computeInitialViewState(
      { bounds: tokyoBounds, centerLat: 35.6768601, centerLon: 139.7638947 },
      dataBounds
    );

    expect(view).toEqual({
      longitude: 139.7638947,
      latitude: 35.6768601,
      zoom: 12,
    });
  });

  it("centers when the center is just outside the data bounds (Altamira)", () => {
    // Admin centre ~40 m north of the banks bbox edge — within tolerance
    const altamiraBounds = "-9.645,-55.623871,-2.9887169,-51.6475378";
    const dataBounds: Bbox = [-52.4477987, -3.6977382, -52.2098271, -3.204434];
    const view = computeInitialViewState(
      { bounds: altamiraBounds, centerLat: -3.204065, centerLon: -52.209961 },
      dataBounds
    );

    expect(view).toEqual({
      longitude: -52.209961,
      latitude: -3.204065,
      zoom: 12,
    });
  });

  it("fits data bounds when the center falls outside them (bad centroid)", () => {
    // Luanda: stored center is the empty province interior, data is in the city
    const luandaBounds = "-10.4562358,12.7897792,-8.5800243,14.6216669";
    const dataBounds: Bbox = [13.15, -8.95, 13.35, -8.75];
    const view = computeInitialViewState(
      { bounds: luandaBounds, centerLat: -9.5180344, centerLon: 13.535676 },
      dataBounds
    );

    expect(view).toEqual({
      bounds: dataBounds,
      fitBoundsOptions: { padding: 20 },
    });
  });

  it("falls back to bounds fit for a large area without a center", () => {
    const view = computeInitialViewState(
      { bounds: tokyoBounds, centerLat: null, centerLon: null },
      null
    );

    expect(view).toEqual({
      bounds: [135.0, 20.2, 154.2, 35.9],
      fitBoundsOptions: { padding: 20 },
    });
  });

  it("uses the center when bounds are missing", () => {
    const view = computeInitialViewState(
      { bounds: null, centerLat: 35.68, centerLon: 139.76 },
      null
    );

    expect(view).toEqual({ longitude: 139.76, latitude: 35.68, zoom: 12 });
  });

  it("falls back to data bounds when area has neither bounds nor center", () => {
    const dataBounds: Bbox = [139.7, 35.6, 139.8, 35.7];
    const view = computeInitialViewState(
      { bounds: null, centerLat: null, centerLon: null },
      dataBounds
    );

    expect(view).toEqual({
      bounds: dataBounds,
      fitBoundsOptions: { padding: 20 },
    });
  });

  it("falls back to world view when nothing is available", () => {
    const view = computeInitialViewState(
      { bounds: null, centerLat: null, centerLon: null },
      null
    );

    expect(view).toEqual({ longitude: 0, latitude: 0, zoom: 2 });
  });
});
