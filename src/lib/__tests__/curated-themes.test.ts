// src/lib/__tests__/curated-themes.test.ts

import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import {
  buildCuratedThemes,
  buildAgeVisibilityFilter,
  buildTagVisibilityFilter,
  buildCuratedColorExpression,
  OTHER_CATEGORY,
  MISSING_CATEGORY,
  TOP_VALUES_COUNT,
} from "../curated-themes";
import { PALETTES } from "../map-themes/palettes";

const feature = (properties: Record<string, unknown> | null): Feature =>
  ({ type: "Feature", geometry: null, properties } as unknown as Feature);

const surfaceFeatures = (values: string[]) =>
  values.map((surface) => feature({ surface }));

describe("buildCuratedThemes", () => {
  it("builds one theme per allow-listed tag present, skipping absent tags", () => {
    const features = [
      feature({ surface: "asphalt" }),
      feature({ surface: "gravel", material: "wood" }),
    ];

    const themes = buildCuratedThemes(features);

    expect(themes.map((t) => t.field).sort()).toEqual(["material", "surface"]);
  });

  it("assigns palette colors to top values by count order", () => {
    const features = surfaceFeatures(["asphalt", "asphalt", "gravel"]);

    const [theme] = buildCuratedThemes(features);

    expect(theme.topValues).toEqual([
      { value: "asphalt", count: 2 },
      { value: "gravel", count: 1 },
    ]);
    expect(theme.colorMap.get("asphalt")).toBe(
      PALETTES.categorical.tableau10[0]
    );
    expect(theme.colorMap.get("gravel")).toBe(
      PALETTES.categorical.tableau10[1]
    );
  });

  it("collapses values beyond the top N into otherCount", () => {
    const values = Array.from(
      { length: TOP_VALUES_COUNT + 2 },
      (_, i) => `value-${i}`
    );
    // value-0 twice so ordering is deterministic; the rest once each
    const features = surfaceFeatures(["value-0", ...values]);

    const [theme] = buildCuratedThemes(features);

    expect(theme.topValues).toHaveLength(TOP_VALUES_COUNT);
    expect(theme.otherCount).toBe(2);
  });

  it("counts features lacking the tag as missing", () => {
    const features = [
      feature({ surface: "asphalt" }),
      feature({}),
      feature(null),
    ];

    const [theme] = buildCuratedThemes(features);

    expect(theme.missingCount).toBe(2);
  });

  it("returns no themes for empty input", () => {
    expect(buildCuratedThemes([])).toEqual([]);
  });
});

describe("buildAgeVisibilityFilter", () => {
  it("returns undefined when nothing is hidden", () => {
    expect(buildAgeVisibilityFilter(new Set())).toBeUndefined();
  });

  it("maps each bucket to its visibility with very-old as fallback", () => {
    const filter = buildAgeVisibilityFilter(new Set(["recent", "very-old"]));

    expect(filter).toEqual([
      "case",
      ["==", ["get", "ageCategory"], "recent"],
      false,
      ["==", ["get", "ageCategory"], "medium"],
      true,
      ["==", ["get", "ageCategory"], "older"],
      true,
      false,
    ]);
  });
});

describe("buildTagVisibilityFilter", () => {
  const theme = buildCuratedThemes(
    surfaceFeatures(["asphalt", "asphalt", "gravel"])
  )[0];

  it("returns undefined when nothing is hidden", () => {
    expect(buildTagVisibilityFilter(theme, new Set())).toBeUndefined();
  });

  it("hides a top value while keeping the rest visible", () => {
    const filter = buildTagVisibilityFilter(theme, new Set(["gravel"]));

    expect(filter).toEqual([
      "case",
      ["!", ["has", "surface"]],
      true,
      [
        "match",
        ["downcase", ["to-string", ["get", "surface"]]],
        ["asphalt"],
        true,
        ["gravel"],
        false,
        true,
      ],
    ]);
  });

  it("hides the other and missing buckets via their synthetic ids", () => {
    const filter = buildTagVisibilityFilter(
      theme,
      new Set([OTHER_CATEGORY, MISSING_CATEGORY])
    );

    expect(filter).toEqual([
      "case",
      ["!", ["has", "surface"]],
      false,
      [
        "match",
        ["downcase", ["to-string", ["get", "surface"]]],
        ["asphalt", "gravel"],
        true,
        false,
      ],
    ]);
  });
});

describe("buildCuratedColorExpression", () => {
  it("colors top values, falls back to other, and grays out missing", () => {
    const theme = buildCuratedThemes(
      surfaceFeatures(["asphalt", "asphalt", "gravel"])
    )[0];

    expect(buildCuratedColorExpression(theme)).toEqual([
      "case",
      ["!", ["has", "surface"]],
      ["to-color", PALETTES.categorical.missing],
      [
        "match",
        ["downcase", ["to-string", ["get", "surface"]]],
        "asphalt",
        PALETTES.categorical.tableau10[0],
        "gravel",
        PALETTES.categorical.tableau10[1],
        PALETTES.categorical.other,
      ],
    ]);
  });
});
