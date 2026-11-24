import { describe, it, expect } from "vitest";
import { galleryCenter } from "../map-gallery";

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