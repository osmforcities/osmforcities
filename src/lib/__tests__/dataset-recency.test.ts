import { describe, it, expect } from "vitest";
import type { Feature, Point } from "geojson";
import {
  computeRecencyBands,
  recencyBand,
  RECENCY_BANDS,
} from "@/lib/dataset-recency";

const NOW = Date.parse("2026-01-01T00:00:00Z");
const DAY = 86_400_000;

// A point feature edited `daysAgo` days before NOW by `user`.
function feat(daysAgo: number | null, user?: string): Feature<Point> {
  const props: Record<string, unknown> = {};
  if (daysAgo !== null) {
    props.timestamp = new Date(NOW - daysAgo * DAY).toISOString();
  }
  if (user) props.user = user;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: props,
  };
}

describe("recencyBand", () => {
  it("maps ages to the four exclusive bands by the shared cutoffs", () => {
    const [c0, c1, c2] = RECENCY_BANDS.map((b) => b.maxDays);
    expect(recencyBand(0)).toBe(0);
    expect(recencyBand(c0 * DAY)).toBe(0); // boundary inclusive
    expect(recencyBand((c0 + 1) * DAY)).toBe(1);
    expect(recencyBand(c1 * DAY)).toBe(1);
    expect(recencyBand((c1 + 1) * DAY)).toBe(2);
    expect(recencyBand(c2 * DAY)).toBe(2);
    expect(recencyBand((c2 + 1) * DAY)).toBe(3);
  });
});

describe("computeRecencyBands", () => {
  it("buckets features across all four bands and sums to the timestamped count", () => {
    const features = [
      feat(10, "a"), // band 0
      feat(200, "b"), // band 1
      feat(500, "c"), // band 2
      feat(1000, "d"), // band 3
      feat(30, "e"), // band 0
    ];
    const { editRecencyBands } = computeRecencyBands(features, NOW);
    expect(editRecencyBands).toEqual([2, 1, 1, 1]);
    expect(editRecencyBands.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("buckets each mapper by their most-recent edit only", () => {
    const features = [
      feat(1000, "alice"), // old
      feat(10, "alice"), // alice's latest -> band 0
      feat(500, "bob"), // bob's only edit -> band 2
    ];
    const { mapperRecencyBands } = computeRecencyBands(features, NOW);
    expect(mapperRecencyBands).toEqual([1, 0, 1, 0]);
    expect(mapperRecencyBands.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("skips features with a missing or unparsable timestamp", () => {
    const features = [
      feat(10, "a"),
      feat(null, "b"), // no timestamp
      { ...feat(10, "c"), properties: { timestamp: "not-a-date", user: "c" } },
    ];
    const { editRecencyBands, mapperRecencyBands } = computeRecencyBands(
      features as Feature[],
      NOW
    );
    expect(editRecencyBands).toEqual([1, 0, 0, 0]);
    expect(mapperRecencyBands).toEqual([1, 0, 0, 0]);
  });

  it("counts a timestamped feature with no user in edit bands but not mappers", () => {
    const { editRecencyBands, mapperRecencyBands } = computeRecencyBands(
      [feat(10)],
      NOW
    );
    expect(editRecencyBands).toEqual([1, 0, 0, 0]);
    expect(mapperRecencyBands).toEqual([0, 0, 0, 0]);
  });

  it("returns all-zero bands for empty input", () => {
    const { editRecencyBands, mapperRecencyBands } = computeRecencyBands([], NOW);
    expect(editRecencyBands).toEqual([0, 0, 0, 0]);
    expect(mapperRecencyBands).toEqual([0, 0, 0, 0]);
  });
});
