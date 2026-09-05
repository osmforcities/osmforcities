// src/lib/__tests__/filter-dimensions.test.ts

import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import {
  computeFilterDimensions,
  FILTERABLE_TAGS,
  type FilterDimension,
} from "../filter-dimensions";
import { AGE_CATEGORY_ORDER } from "../feature-age";

const feature = (properties: Record<string, unknown> | null): Feature =>
  ({ type: "Feature", geometry: null, properties } as unknown as Feature);

const byKey = (dims: FilterDimension[], key: string) =>
  dims.find((d) => d.key === key);

describe("computeFilterDimensions — tag dimensions", () => {
  it("counts allow-listed tag values and sorts desc by count", () => {
    const features = [
      feature({ surface: "asphalt" }),
      feature({ surface: "asphalt" }),
      feature({ surface: "asphalt" }),
      feature({ surface: "gravel" }),
      feature({ surface: "paving_stones" }),
      feature({ surface: "gravel" }),
    ];

    const surface = byKey(computeFilterDimensions(features), "surface");

    expect(surface).toBeDefined();
    expect(surface!.kind).toBe("tag");
    expect(surface!.values).toEqual([
      { value: "asphalt", count: 3 },
      { value: "gravel", count: 2 },
      { value: "paving_stones", count: 1 },
    ]);
  });

  it("counts features missing the tag (null/undefined)", () => {
    const features = [
      feature({ surface: "asphalt" }),
      feature({ surface: null }),
      feature({}), // undefined
      feature({ amenity: "bench" }), // has a different tag, still missing surface
    ];

    const surface = byKey(computeFilterDimensions(features), "surface");

    expect(surface!.missing).toBe(3);
    expect(surface!.values).toEqual([{ value: "asphalt", count: 1 }]);
  });

  it("merges values case-insensitively, preserving the dominant casing", () => {
    const features = [
      feature({ material: "Wood" }),
      feature({ material: "wood" }),
      feature({ material: "wood" }),
      feature({ material: "WOOD" }),
      feature({ material: "Metal" }),
    ];

    const material = byKey(computeFilterDimensions(features), "material");

    expect(material!.values).toEqual([
      // count is the case-folded total (Wood+wood+wood+WOOD); display uses the
      // dominant casing "wood" (3 of 4 occurrences)
      { value: "wood", count: 4 },
      { value: "Metal", count: 1 },
    ]);
  });

  it("splits semicolon-combined values and counts each token separately", () => {
    // OSM tags routinely combine values on one key, e.g. vending=drinks;food.
    const features = [
      feature({ amenity: "drinks;food" }),
      feature({ amenity: "food" }),
      feature({ amenity: "drinks" }),
    ];

    const amenity = byKey(computeFilterDimensions(features), "amenity");

    // the combined-value feature counts toward BOTH "drinks" and "food" —
    // never rendered as its own literal "drinks;food" row.
    expect(amenity!.values).toEqual(
      expect.arrayContaining([
        { value: "drinks", count: 2 },
        { value: "food", count: 2 },
      ]),
    );
    expect(amenity!.values).toHaveLength(2);
  });

  it("coerces non-string tag values to strings", () => {
    // `amenity` is allow-listed; use it with a numeric-ish value to exercise coercion
    const features = [
      feature({ amenity: 2 }),
      feature({ amenity: 2 }),
      feature({ amenity: "bench" }),
    ];

    const amenity = byKey(computeFilterDimensions(features), "amenity");

    expect(amenity!.values).toEqual([
      { value: "2", count: 2 },
      { value: "bench", count: 1 },
    ]);
  });

  it("omits allow-listed tags absent from all features", () => {
    const features = [feature({ amenity: "bench" })];

    const dims = computeFilterDimensions(features);

    expect(byKey(dims, "surface")).toBeUndefined();
    expect(byKey(dims, "material")).toBeUndefined();
    expect(byKey(dims, "amenity")).toBeDefined();
  });

  it("ignores present tags that are not allow-listed", () => {
    const features = [
      feature({ colour: "red" }),
      feature({ colour: "blue" }),
    ];

    const dims = computeFilterDimensions(features);

    expect(byKey(dims, "colour")).toBeUndefined();
    // only the always-present age dimension remains
    expect(dims.map((d) => d.key)).toEqual(["age"]);
  });

  it("honors a custom filterableTags argument over the default seed", () => {
    const features = [
      feature({ colour: "red" }),
      feature({ surface: "asphalt" }),
    ];

    const dims = computeFilterDimensions(features, ["colour"]);

    expect(byKey(dims, "colour")).toBeDefined();
    expect(byKey(dims, "surface")).toBeUndefined();
  });

  it("drops an all-missing curated tag by default", () => {
    const features = [feature({ amenity: "hospital" })];

    const dims = computeFilterDimensions(features, ["wheelchair"]);

    expect(byKey(dims, "wheelchair")).toBeUndefined();
  });

  it("keeps an all-missing curated tag when keepEmpty is set (Missing is the finding)", () => {
    const features = [feature({ amenity: "hospital" }), feature({ amenity: "clinic" })];

    const dim = byKey(
      computeFilterDimensions(features, ["wheelchair"], { keepEmpty: true }),
      "wheelchair"
    );

    expect(dim).toBeDefined();
    expect(dim!.values).toEqual([]);
    expect(dim!.missing).toBe(2);
  });
});

// _ts is epoch seconds; helpers build values relative to now
const tsDaysAgo = (days: number) => Math.floor(Date.now() / 1000) - days * 86_400;

describe("computeFilterDimensions — age dimension", () => {
  it("is always present with buckets in ordinal order, omitting zero-count buckets", () => {
    const features = [
      feature({ _ts: tsDaysAgo(60) }), // older
      feature({ _ts: tsDaysAgo(1) }), // recent
      feature({ _ts: tsDaysAgo(2) }), // recent
      feature({ _ts: tsDaysAgo(400) }), // very-old
    ];

    const age = byKey(computeFilterDimensions(features), "age");

    expect(age!.kind).toBe("age");
    // ordinal order (recent, medium, older, very-old); `medium` omitted (zero)
    expect(age!.values).toEqual([
      { value: "recent", count: 2 },
      { value: "older", count: 1 },
      { value: "very-old", count: 1 },
    ]);
  });

  it("counts features without a valid _ts as very-old, mirroring the paint fallback", () => {
    const features = [
      feature({ _ts: tsDaysAgo(1) }),
      feature({ _ts: "bogus" }),
      feature({}),
      feature(null),
    ];

    const age = byKey(computeFilterDimensions(features), "age");

    expect(age!.missing).toBe(0);
    expect(age!.values).toEqual([
      { value: "recent", count: 1 },
      { value: "very-old", count: 3 },
    ]);
  });

  it("keeps age buckets in the declared ordinal order", () => {
    const features = [1, 20, 60, 400].map((days) =>
      feature({ _ts: tsDaysAgo(days) })
    );

    const age = byKey(computeFilterDimensions(features), "age");

    expect(age!.values.map((v) => v.value)).toEqual([...AGE_CATEGORY_ORDER]);
  });
});

describe("computeFilterDimensions — edge cases", () => {
  it("handles an empty feature array without throwing", () => {
    const dims = computeFilterDimensions([]);

    expect(dims).toEqual([{ key: "age", kind: "age", values: [], missing: 0 }]);
  });

  it("handles features with null properties", () => {
    const features = [feature(null), feature(null)];

    const dims = computeFilterDimensions(features);

    // no tag dimensions; age present with everything bucketed very-old
    expect(dims).toHaveLength(1);
    expect(byKey(dims, "age")!.values).toEqual([
      { value: "very-old", count: 2 },
    ]);
  });

  it("exposes a non-empty default allow-list", () => {
    expect(FILTERABLE_TAGS.length).toBeGreaterThan(0);
  });
});
