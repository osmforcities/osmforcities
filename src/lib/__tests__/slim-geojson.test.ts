import { describe, it, expect } from "vitest";
import type { FeatureCollection } from "geojson";
import { toSlimGeojson } from "../slim-geojson";

const collection: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1.23456789, 2.98765432] },
      properties: { "@timestamp": "2020-01-01T00:00:00Z", building: "house", name: "A" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { timestamp: "2021-01-01T00:00:00Z", name: "B" },
    },
  ],
};

describe("toSlimGeojson", () => {
  it("keeps only the timestamp and truncates coordinates", () => {
    const slim = toSlimGeojson(collection, null);
    expect(slim.features.map((f) => f.properties)).toEqual([
      { "@timestamp": "2020-01-01T00:00:00Z" },
      { "@timestamp": "2021-01-01T00:00:00Z" },
    ]);
    expect(slim.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [1.234568, 2.987654],
    });
  });

  it("keeps the default view tag where a feature carries it", () => {
    const slim = toSlimGeojson(collection, "building");
    expect(slim.features.map((f) => f.properties)).toEqual([
      { "@timestamp": "2020-01-01T00:00:00Z", building: "house" },
      { "@timestamp": "2021-01-01T00:00:00Z" },
    ]);
  });
});
