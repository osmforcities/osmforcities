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

const ageCategoryOf = (props: Record<string, unknown>) => {
  const processed = processOSMFeaturesForVisualization(collection([props]));
  return processed.features[0].properties?.ageCategory;
};

describe("processOSMFeaturesForVisualization — age categorization", () => {
  it("buckets a fresh timestamp as recent", () => {
    expect(ageCategoryOf({ "@timestamp": new Date().toISOString() })).toBe(
      "recent"
    );
  });

  it("buckets an old timestamp as very-old", () => {
    expect(ageCategoryOf({ "@timestamp": "2020-01-01T00:00:00Z" })).toBe(
      "very-old"
    );
  });

  it("falls back to very-old when the timestamp is missing", () => {
    expect(ageCategoryOf({})).toBe("very-old");
  });

  it("falls back to very-old when the timestamp is unparsable", () => {
    expect(ageCategoryOf({ "@timestamp": "not-a-date" })).toBe("very-old");
    expect(ageCategoryOf({ timestamp: "??" })).toBe("very-old");
  });
});
