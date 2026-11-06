import { describe, it, expect } from "vitest";
import { GALLERY_CASES, galleryCenter, galleryRenderModes } from "../map-gallery";

describe("galleryRenderModes", () => {
  const geojson = { type: "FeatureCollection", features: [] };
  const tilesPath = "/api/tiles/ds-1-3.pmtiles";

  it("pairs geojson with tiles when the dataset has both", () => {
    expect(galleryRenderModes({ geojson, tilesPath })).toEqual(["geojson", "tiles"]);
  });

  it("shows only what the dataset ships in", () => {
    expect(galleryRenderModes({ geojson: null, tilesPath })).toEqual(["tiles"]);
    expect(galleryRenderModes({ geojson, tilesPath: null })).toEqual(["geojson"]);
  });

  it("is empty with neither", () => {
    expect(galleryRenderModes({ geojson: null, tilesPath: null })).toEqual([]);
  });
});

describe("galleryCenter", () => {
  it("uses the area center", () => {
    expect(galleryCenter({ centerLat: 52.37, centerLon: 4.89 }, [0, 0, 1, 1])).toEqual([
      4.89, 52.37,
    ]);
  });

  it("falls back to the middle of the dataset bbox", () => {
    expect(galleryCenter({ centerLat: null, centerLon: null }, [4, 52, 5, 53])).toEqual([
      4.5, 52.5,
    ]);
  });

  it("is null with neither", () => {
    expect(galleryCenter({ centerLat: null, centerLon: null }, null)).toBeNull();
  });
});

describe("GALLERY_CASES", () => {
  it("has no duplicate rows", () => {
    const keys = GALLERY_CASES.map((c) => `${c.templateId}/${c.osmRelationId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
