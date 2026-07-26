import { describe, it, expect } from "vitest";
import type { Feature, Point } from "geojson";
import { computeTagCounts } from "@/lib/dataset-tags";

function feat(properties: Record<string, unknown>): Feature<Point> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties,
  };
}

describe("computeTagCounts", () => {
  it("counts key presence across features, sorted most-used first", () => {
    const counts = computeTagCounts([
      feat({ name: "A", shelter: "yes" }),
      feat({ name: "B", shelter: "no", bench: "yes" }),
      feat({ name: "C" }),
    ]);
    expect(counts).toEqual([
      { key: "name", count: 3 },
      { key: "shelter", count: 2 },
      { key: "bench", count: 1 },
    ]);
  });

  it("skips @-prefixed internals and NON_TAG_KEYS", () => {
    const counts = computeTagCounts([
      feat({
        highway: "bus_stop",
        id: "node/1",
        user: "mapper",
        timestamp: "2025-01-01T00:00:00Z",
        version: 3,
        changeset: 9,
        uid: 42,
        ageCategory: "recent",
        "@relations": [],
      }),
    ]);
    expect(counts).toEqual([{ key: "highway", count: 1 }]);
  });

  it("keeps query and filterable keys (helper is template-agnostic)", () => {
    // highway is a query key, shelter a filterable key — both counted here; the
    // panel applies those filters, not this helper.
    const counts = computeTagCounts([feat({ highway: "bus_stop", shelter: "yes" })]);
    expect(counts.map((c) => c.key).sort()).toEqual(["highway", "shelter"]);
  });

  it("returns [] for empty input", () => {
    expect(computeTagCounts([])).toEqual([]);
  });
});
