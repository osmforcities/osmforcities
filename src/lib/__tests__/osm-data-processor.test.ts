import { describe, it, expect } from "vitest";
import type { FeatureCollection } from "geojson";
import { processOSMFeaturesForVisualization } from "../osm-data-processor";

const collection = (
  properties: Array<Record<string, unknown>>
): FeatureCollection => ({
  type: "FeatureCollection",
  features: properties.map((props) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: props,
  })),
});

const tsOf = (props: Record<string, unknown>) => {
  const processed = processOSMFeaturesForVisualization(collection([props]));
  return processed.features[0].properties?._ts;
};

describe("processOSMFeaturesForVisualization — _ts stamping", () => {
  it("stamps epoch seconds from @timestamp", () => {
    expect(tsOf({ "@timestamp": "2020-01-01T00:00:00Z" })).toBe(1577836800);
  });

  it("falls back to the plain timestamp property", () => {
    expect(tsOf({ timestamp: "2020-01-01T00:00:00Z" })).toBe(1577836800);
  });

  it("stamps nothing when the timestamp is missing", () => {
    expect(tsOf({})).toBeUndefined();
  });

  it("stamps nothing when the timestamp is unparsable", () => {
    expect(tsOf({ "@timestamp": "not-a-date" })).toBeUndefined();
    expect(tsOf({ timestamp: "??" })).toBeUndefined();
  });

  it("preserves existing properties", () => {
    const processed = processOSMFeaturesForVisualization(
      collection([{ "@timestamp": "2020-01-01T00:00:00Z", amenity: "bench" }])
    );
    expect(processed.features[0].properties?.amenity).toBe("bench");
  });
});
