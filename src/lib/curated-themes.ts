import type { Feature } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import {
  computeFilterDimensions,
  FILTERABLE_TAGS,
  type FilterDimension,
} from "./filter-dimensions";
import { AGE_CATEGORY_ORDER, ageStep } from "./feature-age";
import { PALETTES } from "./map-palettes";

/**
 * A curated categorical theme for an allow-listed tag. Unlike the old
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
  /** topValues are already in final display order; the legend must not re-sort them. */
  presorted: boolean;
};

/** One toggleable row of the active legend view. */
export type LegendCategory = {
  id: string;
  label: string;
  color: string;
  count: number;
  /** De-emphasize the label (synthetic rows like "Missing"). */
  muted?: boolean;
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

/** A value is numeric if it is an integer or decimal (e.g. capacity "12"). */
const NUMERIC_VALUE = /^-?\d+(\.\d+)?$/;

/** True when the dimension is numeric — every shown value parses as a number. */
export function isNumericValues(
  values: Array<{ value: string; count: number }>
): boolean {
  return values.length > 0 && values.every((v) => NUMERIC_VALUE.test(v.value));
}

/**
 * Order legend rows for display: numeric fields ascending (2,4,6,...), otherwise
 * keep the incoming count-desc order (the component re-sorts categorical rows by
 * localized label). Returns a new array only when it sorts.
 */
export function sortForDisplay(
  values: Array<{ value: string; count: number }>
): Array<{ value: string; count: number }> {
  if (!isNumericValues(values)) return values;
  return [...values].sort((a, b) => Number(a.value) - Number(b.value));
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
      // Keep the top values (dim.values is count-desc); sortForDisplay orders
      // numeric fields ascending and leaves categorical ones for the component.
      const selected = dim.values.slice(0, TOP_VALUES_COUNT);
      const topValues = sortForDisplay(selected);
      // sortForDisplay returns a new array only for numeric fields (it sorts
      // them); an identical reference means categorical, so the component
      // re-sorts those by localized label instead.
      const presorted = topValues !== selected;
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
        presorted,
      };
    });
}

/**
 * Assemble the legend rows for a curated tag theme: one localized, colored row
 * per top value, sorted by localized label unless the theme is presorted
 * (numeric), then the synthetic Other/Missing rows appended last. Pure — the
 * caller supplies the localizers (labels + value formatter) so it stays testable
 * and free of next-intl.
 */
export function buildLegendRows(
  theme: CuratedTheme,
  opts: {
    localizeValue: (value: string) => string;
    locale: string;
    otherLabel: string;
    missingLabel: string;
  }
): LegendCategory[] {
  const rows: LegendCategory[] = theme.topValues.map(({ value, count }) => ({
    id: value.toLowerCase(),
    label: opts.localizeValue(value),
    color: theme.colorMap.get(value.toLowerCase())!,
    count,
  }));
  // Localized categorical rows read as unsorted in count order, so sort them by
  // label. Presorted (numeric) rows are already ordered and left as-is.
  if (!theme.presorted) {
    rows.sort((a, b) => a.label.localeCompare(b.label, opts.locale));
  }
  if (theme.otherCount > 0) {
    rows.push({
      id: OTHER_CATEGORY,
      label: opts.otherLabel,
      color: PALETTES.categorical.other,
      count: theme.otherCount,
    });
  }
  if (theme.missingCount > 0) {
    rows.push({
      id: MISSING_CATEGORY,
      label: opts.missingLabel,
      color: PALETTES.categorical.missing,
      count: theme.missingCount,
      muted: true,
    });
  }
  return rows;
}

/** Normalized tag accessor: lowercased string value of the field. */
const tagValue = (field: string) => [
  "downcase",
  ["to-string", ["get", field]],
];

/**
 * MapLibre filter hiding the given age buckets, bucketing `_ts` at call time
 * like the paint expressions. Features without a valid `_ts` follow the
 * "very-old" bucket, mirroring ageStep's fallback. Returns undefined when
 * nothing is hidden (no filter).
 */
export function buildAgeVisibilityFilter(
  hidden: ReadonlySet<string>
): FilterSpecification | undefined {
  if (hidden.size === 0) return undefined;
  const [recent, medium, older, veryOld] = AGE_CATEGORY_ORDER;
  const filter = ageStep({
    recent: !hidden.has(recent),
    medium: !hidden.has(medium),
    older: !hidden.has(older),
    "very-old": !hidden.has(veryOld),
  });
  // ageStep collapses to a bare boolean when every bucket is hidden; a filter
  // root must be an expression
  return (
    Array.isArray(filter) ? filter : ["literal", filter]
  ) as FilterSpecification;
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
