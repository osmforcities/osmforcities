// src/lib/filter-dimensions.ts

import type { Feature } from "geojson";

/**
 * A single filterable value within a dimension, with how many features carry it.
 */
export type FilterDimensionValue = { value: string; count: number };

/**
 * A filter dimension the FilterPanel (#339) renders and the map swap (#340)
 * drives highlight/mute from.
 *
 * - `tag`  — an allow-listed OSM tag; `values` sorted desc by count.
 * - `age`  — feature edit-age buckets; `values` in fixed ordinal order.
 *
 * `missing` = features lacking this dimension (data-quality signal).
 */
export type FilterDimension = {
  key: string;
  kind: "tag" | "age";
  values: FilterDimensionValue[];
  missing: number;
};

/**
 * Allow-list of tag keys that become filter dimensions. Introduced progressively:
 * grow this list as more tags prove useful to filter on.
 *
 * TODO(#184): move allow-list to per-template config (templates.yml) so datasets
 * expose the tags meaningful to them (e.g. trees -> genus/leaf_type).
 */
export const FILTERABLE_TAGS: readonly string[] = [
  "surface",
  "amenity",
  "material",
  "leaf_type",
];

/**
 * Fixed ordinal order for the age dimension, mirroring the buckets assigned by
 * `categorizeFeatureByAge` in osm-data-processor.ts.
 */
export const AGE_CATEGORY_ORDER = [
  "recent",
  "medium",
  "older",
  "very-old",
] as const;

type AgeCategory = (typeof AGE_CATEGORY_ORDER)[number];

const isAgeCategory = (v: unknown): v is AgeCategory =>
  typeof v === "string" && (AGE_CATEGORY_ORDER as readonly string[]).includes(v);

/**
 * Count an allow-listed tag across features, case-folded, preserving the dominant
 * original casing for display. Returns values sorted desc by count plus a `missing`
 * count. Salvaged from `detectCategoricalTheme` (map-themes/detection.ts) minus the
 * color/scoring/category-count gating — here we surface every value.
 */
function computeTagDimension(features: Feature[], key: string): FilterDimension {
  const countByLower = new Map<string, number>();
  // lower -> (original casing -> count), to pick the dominant casing for display
  const casingByLower = new Map<string, Map<string, number>>();
  let missing = 0;

  for (const feature of features) {
    const raw = feature.properties?.[key];
    if (raw === null || raw === undefined) {
      missing++;
      continue;
    }

    const value = String(raw);
    const lower = value.toLowerCase();
    countByLower.set(lower, (countByLower.get(lower) ?? 0) + 1);

    if (!casingByLower.has(lower)) casingByLower.set(lower, new Map());
    const casing = casingByLower.get(lower)!;
    casing.set(value, (casing.get(value) ?? 0) + 1);
  }

  const values: FilterDimensionValue[] = Array.from(countByLower.entries())
    .map(([lower, count]) => ({ value: dominantCasing(casingByLower.get(lower)!), count }))
    .sort((a, b) => b.count - a.count);

  return { key, kind: "tag", values, missing };
}

/** Pick the most frequent original casing variant for a lowercased value. */
function dominantCasing(casing: Map<string, number>): string {
  let best = "";
  let bestCount = -1;
  for (const [variant, count] of casing.entries()) {
    if (count > bestCount) {
      bestCount = count;
      best = variant;
    }
  }
  return best;
}

/**
 * Count the internal `ageCategory` property into ordinal buckets. Zero-count buckets
 * are omitted; features without a valid category count toward `missing`.
 */
function computeAgeDimension(features: Feature[]): FilterDimension {
  const counts = new Map<AgeCategory, number>();
  let missing = 0;

  for (const feature of features) {
    const category = feature.properties?.ageCategory;
    if (isAgeCategory(category)) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    } else {
      missing++;
    }
  }

  const values: FilterDimensionValue[] = AGE_CATEGORY_ORDER.filter((c) =>
    counts.has(c)
  ).map((c) => ({ value: c, count: counts.get(c)! }));

  return { key: "age", kind: "age", values, missing };
}

/**
 * Turn a dataset's geojson features into filter dimensions for the FilterPanel.
 *
 * Emits one dimension per allow-listed tag that is present in at least one feature
 * (sorted desc by count, with a `missing` count), plus an always-present `age`
 * dimension. Pure — pass a custom `filterableTags` to override the default seed list.
 */
export function computeFilterDimensions(
  features: Feature[],
  filterableTags: readonly string[] = FILTERABLE_TAGS
): FilterDimension[] {
  const tagDimensions = filterableTags
    .map((key) => computeTagDimension(features, key))
    // Only surface tags actually present in the data.
    .filter((dim) => dim.values.length > 0);

  return [...tagDimensions, computeAgeDimension(features)];
}
