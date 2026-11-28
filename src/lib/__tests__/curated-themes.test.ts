// src/lib/__tests__/curated-themes.test.ts

import { describe, it, expect } from "vitest";
import {
  buildCuratedThemesFromDimensions,
  buildAgeVisibilityFilter,
  buildTagVisibilityFilter,
  buildCuratedColorExpression,
  buildLegendRows,
  findOpeningTheme,
  sortForDisplay,
  OTHER_CATEGORY,
  MISSING_CATEGORY,
  TOP_VALUES_COUNT,
  type CuratedTheme,
} from "../curated-themes";
import { PALETTES } from "../map-palettes";
import type { FilterDimension } from "../filter-dimensions";

const tagDimension = (
  key: string,
  countDescValues: [value: string, count: number][],
  missing = 0
): FilterDimension => ({
  key,
  kind: "tag",
  values: countDescValues.map(([value, count]) => ({ value, count })),
  missing,
});

const surfaceTheme = () =>
  buildCuratedThemesFromDimensions([
    tagDimension("surface", [
      ["asphalt", 2],
      ["gravel", 1],
    ]),
  ])[0];

describe("sortForDisplay", () => {
  it("sorts numeric values ascending", () => {
    const sorted = sortForDisplay([
      { value: "10", count: 3 },
      { value: "2", count: 2 },
      { value: "5", count: 1 },
    ]);
    expect(sorted.map((v) => v.value)).toEqual(["2", "5", "10"]);
  });

  it("keeps count order for non-numeric values", () => {
    const values = [
      { value: "asphalt", count: 3 },
      { value: "gravel", count: 1 },
    ];
    expect(sortForDisplay(values)).toEqual(values);
  });

  it("keeps count order when values are mixed numeric/non-numeric", () => {
    const values = [
      { value: "yes", count: 3 },
      { value: "2", count: 1 },
    ];
    expect(sortForDisplay(values)).toEqual(values);
  });

  it("handles decimals and negatives numerically", () => {
    const sorted = sortForDisplay([
      { value: "1.5", count: 1 },
      { value: "-2", count: 1 },
      { value: "10", count: 1 },
    ]);
    expect(sorted.map((v) => v.value)).toEqual(["-2", "1.5", "10"]);
  });
});

describe("buildCuratedThemesFromDimensions — numeric display order", () => {
  it("selects top values by count but displays them ascending numerically", () => {
    const [theme] = buildCuratedThemesFromDimensions([
      tagDimension("capacity", [
        ["10", 3],
        ["2", 2],
        ["5", 1],
      ]),
    ]);

    expect(theme.topValues.map((v) => v.value)).toEqual(["2", "5", "10"]);
    // colors are assigned in the displayed (numeric) order
    expect(theme.colorMap.get("2")).toBe(PALETTES.categorical.tableau10[0]);
  });
});

describe("buildLegendRows", () => {
  // count-desc input where the alphabetical order differs, so a sort is visible
  const baseTheme: CuratedTheme = {
    field: "surface",
    colorMap: new Map([
      ["zebra", "#z"],
      ["apple", "#a"],
    ]),
    topValues: [
      { value: "zebra", count: 3 },
      { value: "apple", count: 1 },
    ],
    otherCount: 0,
    missingCount: 0,
    presorted: false,
  };
  const opts = {
    localizeValue: (v: string) => v,
    locale: "en",
    otherLabel: "Other",
    missingLabel: "Missing",
  };

  it("sorts categorical rows by localized label", () => {
    const rows = buildLegendRows(baseTheme, opts);
    expect(rows.map((r) => r.id)).toEqual(["apple", "zebra"]);
  });

  it("keeps presorted (numeric) rows in their given order", () => {
    const rows = buildLegendRows({ ...baseTheme, presorted: true }, opts);
    expect(rows.map((r) => r.id)).toEqual(["zebra", "apple"]);
  });

  it("applies the value localizer to labels and sorts on the result", () => {
    const rows = buildLegendRows(baseTheme, {
      ...opts,
      localizeValue: (v) => v.toUpperCase(),
    });
    expect(rows.map((r) => r.label)).toEqual(["APPLE", "ZEBRA"]);
  });

  it("appends Other then Missing (muted) after the value rows", () => {
    const rows = buildLegendRows(
      { ...baseTheme, otherCount: 5, missingCount: 2 },
      opts
    );
    expect(rows.slice(0, 2).map((r) => r.id)).toEqual(["apple", "zebra"]);
    const [other, missing] = rows.slice(-2);
    expect(other.id).toBe(OTHER_CATEGORY);
    expect(missing.id).toBe(MISSING_CATEGORY);
    expect(missing.muted).toBe(true);
  });
});

describe("buildCuratedThemesFromDimensions", () => {
  it("builds one theme per tag dimension, skipping the age dimension", () => {
    const themes = buildCuratedThemesFromDimensions([
      tagDimension("surface", [
        ["asphalt", 1],
        ["gravel", 1],
      ]),
      tagDimension("material", [["wood", 1]], 1),
      { key: "age", kind: "age", values: [{ value: "recent", count: 2 }], missing: 0 },
    ]);

    expect(themes.map((t) => t.field)).toEqual(["surface", "material"]);
  });

  it("assigns palette colors to top values by count order", () => {
    const theme = surfaceTheme();

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
      (_, i): [string, number] => [`value-${i}`, 1]
    );

    const [theme] = buildCuratedThemesFromDimensions([
      tagDimension("surface", values),
    ]);

    expect(theme.topValues).toHaveLength(TOP_VALUES_COUNT);
    expect(theme.otherCount).toBe(2);
  });

  it("carries the dimension's missing count", () => {
    const [theme] = buildCuratedThemesFromDimensions([
      tagDimension("surface", [["asphalt", 1]], 2),
    ]);

    expect(theme.missingCount).toBe(2);
  });

  it("returns no themes for no dimensions", () => {
    expect(buildCuratedThemesFromDimensions([])).toEqual([]);
  });
});

describe("buildAgeVisibilityFilter", () => {
  it("returns undefined when nothing is hidden", () => {
    expect(buildAgeVisibilityFilter(new Set())).toBeUndefined();
  });

  it("maps each bucket to its visibility via a step on _ts with very-old as base", () => {
    const filter = buildAgeVisibilityFilter(
      new Set(["recent", "very-old"])
    ) as unknown[];

    expect(filter[0]).toBe("step");
    expect(filter[1]).toEqual(["number", ["get", "_ts"], 0]);
    // step outputs: base (very-old), then per-cutoff older, medium, recent
    expect([filter[2], filter[4], filter[6], filter[8]]).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("stays a valid expression when every bucket is hidden", () => {
    const filter = buildAgeVisibilityFilter(
      new Set(["recent", "medium", "older", "very-old"])
    );

    expect(filter).toEqual(["literal", false]);
  });
});

describe("buildTagVisibilityFilter", () => {
  const theme = surfaceTheme();

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
    expect(buildCuratedColorExpression(surfaceTheme())).toEqual([
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

describe("findOpeningTheme", () => {
  const themes = buildCuratedThemesFromDimensions([
    tagDimension("building", [
      ["house", 1],
      ["yes", 1],
    ]),
    tagDimension("roof:shape", [], 2),
  ]);

  it("returns the default view's theme when its tag has values", () => {
    expect(findOpeningTheme(themes, "building")?.field).toBe("building");
  });

  it("returns null without a default view", () => {
    expect(findOpeningTheme(themes, null)).toBeNull();
  });

  it("returns null when the tag is absent from the data", () => {
    expect(findOpeningTheme(themes, "roof:shape")).toBeNull();
  });

  it("returns null when the tag is not a theme", () => {
    expect(findOpeningTheme(themes, "levels")).toBeNull();
  });
});
