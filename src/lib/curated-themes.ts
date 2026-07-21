import type { Feature } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import {
  computeFilterDimensions,
  FILTERABLE_TAGS,
  AGE_CATEGORY_ORDER,
  type FilterDimension,
} from "./filter-dimensions";
import { PALETTES } from "./map-palettes";

/**
 * A curated categorical theme for an allow-listed tag (#184). Unlike the old
 * auto-detected themes, curation means the tag was explicitly approved as
 * meaningful to color by — no scoring, no coverage gating.
 */
export type CuratedTheme = {
  field: string;
  /** lowercased value -> color, for topValues only */
  colorMap: Map<string, string>;
  /** Top values by count, dominant casing preserved for display */
  topValues: Array<{ value: string; count: number }>;
  /** Features whose value falls beyond topValues */
  otherCount: number;
  /** Features lacking the tag entirely */
  missingCount: number;
};

/** Legend/category ids for the synthetic buckets of a tag view. */
export const OTHER_CATEGORY = "__other__";
export const MISSING_CATEGORY = "__missing__";

/** Values per theme that get their own color + legend row. */
export const TOP_VALUES_COUNT = 8;

/**
 * Build curated categorical themes from the filterable-tag allow-list.
 * One theme per allow-listed tag present in the data; values beyond the top
 * N collapse into "Other". Pure — pass a custom allow-list to override.
 */
export function buildCuratedThemes(
  features: Feature[],
  filterableTags: readonly string[] = FILTERABLE_TAGS
): CuratedTheme[] {
  return buildCuratedThemesFromDimensions(
    computeFilterDimensions(features, filterableTags)
  );
}

/**
 * Variant taking precomputed dimensions, so callers that also need the age
 * dimension can run computeFilterDimensions once and derive both from it.
 */
export function buildCuratedThemesFromDimensions(
  dimensions: FilterDimension[]
): CuratedTheme[] {
  return dimensions
    .filter((dim) => dim.kind === "tag")
    .map((dim) => {
      const topValues = dim.values.slice(0, TOP_VALUES_COUNT);
      const otherCount = dim.values
        .slice(TOP_VALUES_COUNT)
        .reduce((sum, v) => sum + v.count, 0);
      const colorMap = new Map(
        topValues.map((v, i) => [
          v.value.toLowerCase(),
          PALETTES.categorical.tableau10[i],
        ])
      );
      return {
        field: dim.key,
        colorMap,
        topValues,
        otherCount,
        missingCount: dim.missing,
      };
    });
}

/** Normalized tag accessor: lowercased string value of the field. */
const tagValue = (field: string) => [
  "downcase",
  ["to-string", ["get", field]],
];

/**
 * MapLibre filter hiding the given age buckets. Features without a valid
 * ageCategory follow the "very-old" bucket, mirroring the paint fallback in
 * map-style's ageCase. Returns undefined when nothing is hidden (no filter).
 */
export function buildAgeVisibilityFilter(
  hidden: ReadonlySet<string>
): FilterSpecification | undefined {
  if (hidden.size === 0) return undefined;
  const [recent, medium, older, veryOld] = AGE_CATEGORY_ORDER;
  return [
    "case",
    ["==", ["get", "ageCategory"], recent],
    !hidden.has(recent),
    ["==", ["get", "ageCategory"], medium],
    !hidden.has(medium),
    ["==", ["get", "ageCategory"], older],
    !hidden.has(older),
    !hidden.has(veryOld),
  ] as FilterSpecification;
}

/**
 * MapLibre filter hiding the given categories of a tag view. Category ids are
 * lowercased top values plus OTHER_CATEGORY / MISSING_CATEGORY. Returns
 * undefined when nothing is hidden.
 */
export function buildTagVisibilityFilter(
  theme: CuratedTheme,
  hidden: ReadonlySet<string>
): FilterSpecification | undefined {
  if (hidden.size === 0) return undefined;

  const top = theme.topValues.map((v) => v.value.toLowerCase());
  const visibleTop = top.filter((v) => !hidden.has(v));
  const hiddenTop = top.filter((v) => hidden.has(v));
  const otherVisible = !hidden.has(OTHER_CATEGORY);
  const missingVisible = !hidden.has(MISSING_CATEGORY);

  const matchParts: unknown[] = [];
  if (visibleTop.length > 0) matchParts.push(visibleTop, true);
  if (hiddenTop.length > 0) matchParts.push(hiddenTop, false);

  const valueVisibility = (
    matchParts.length > 0
      ? ["match", tagValue(theme.field), ...matchParts, otherVisible]
      : ["boolean", otherVisible]
  ) as ExpressionSpecification;

  return [
    "case",
    ["!", ["has", theme.field]],
    missingVisible,
    valueVisibility,
  ] as FilterSpecification;
}

/**
 * MapLibre color expression for a curated theme: top values get their palette
 * color, everything else the "other" gray, missing tags the lighter missing
 * gray. Applies to circle-color, line-color, and fill-color alike.
 */
export function buildCuratedColorExpression(theme: CuratedTheme): unknown[] {
  const matchParts: unknown[] = [];
  for (const [value, color] of theme.colorMap.entries()) {
    matchParts.push(value, color);
  }

  const valueColor =
    matchParts.length > 0
      ? ["match", tagValue(theme.field), ...matchParts, PALETTES.categorical.other]
      : ["to-color", PALETTES.categorical.other];

  return [
    "case",
    ["!", ["has", theme.field]],
    ["to-color", PALETTES.categorical.missing],
    valueColor,
  ];
}
