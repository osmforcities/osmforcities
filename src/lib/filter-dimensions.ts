// src/lib/filter-dimensions.ts

import type { Feature } from "geojson";
import {
  AGE_CATEGORY_ORDER,
  ageCategoryOfTs,
  featureTs,
  type AgeCategory,
} from "./feature-age";

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
 * Default allow-list of tag keys that become filter dimensions, used only when a
 * caller omits the `filterableTags` argument. The dataset map always passes a
 * template's explicit list (empty -> age-only), so this default does not act as a
 * per-template fallback; per-template lists live in templates.yml.
 */
export const FILTERABLE_TAGS: readonly string[] = [
  "surface",
  "amenity",
  "material",
  "leaf_type",
];

/**
 * Count an allow-listed tag across features, case-folded, preserving the dominant
 * original casing for display. Returns values sorted desc by count plus a `missing`
 * count. Salvaged from the removed map-themes auto-detection minus the
 * color/scoring/category-count gating — here we surface every value.
 *
 * OSM tags routinely combine multiple values on one key with `;` (e.g.
 * `vending=drinks;food`, matching the Overpass query builder's own semicolon-list
 * convention — see buildOverpassQuery in prisma/lib/template-parser.ts). Each
 * semicolon-separated token is counted toward its own value bucket, so a
 * combined-value feature contributes to every value it actually carries rather
 * than rendering as one literal, untranslated "a;b" row. This means a single
 * feature can count toward more than one bucket for the same key — expected for
 * a multi-valued field, not a double-count bug.
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

    const tokens = String(raw)
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);

    for (const value of tokens.length > 0 ? tokens : [String(raw)]) {
      const lower = value.toLowerCase();
      countByLower.set(lower, (countByLower.get(lower) ?? 0) + 1);

      if (!casingByLower.has(lower)) casingByLower.set(lower, new Map());
      const casing = casingByLower.get(lower)!;
      casing.set(value, (casing.get(value) ?? 0) + 1);
    }
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
 * Bucket each feature's edit timestamp into ordinal age buckets against a
 * single `now`. Zero-count buckets are omitted. Features without a usable
 * timestamp count as "very-old", mirroring the map's paint fallback (ageStep
 * coerces missing `_ts` to 0), so `missing` is always 0.
 *
 * Reads through featureTs, so this works on both the client's stamped `_ts`
 * features and raw snapshot features carrying only the OSM meta timestamp.
 */
function computeAgeDimension(features: Feature[]): FilterDimension {
  const now = Date.now();
  const counts = new Map<AgeCategory, number>();

  for (const feature of features) {
    const category = ageCategoryOfTs(featureTs(feature), now);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const values: FilterDimensionValue[] = AGE_CATEGORY_ORDER.filter((c) =>
    counts.has(c)
  ).map((c) => ({ value: c, count: counts.get(c)! }));

  return { key: "age", kind: "age", values, missing: 0 };
}

/**
 * Turn a dataset's geojson features into filter dimensions for the FilterPanel.
 *
 * Emits one dimension per allow-listed tag (sorted desc by count, with a `missing`
 * count), plus an always-present `age` dimension. Pure — pass a custom
 * `filterableTags` to override the default seed list.
 *
 * `keepEmpty` controls all-missing tags (present in the list but carried by no
 * feature). Default `false` drops them — right for the heuristic default seed,
 * where an absent tag is just noise. Curated per-template lists pass `true`: every
 * key was deliberately chosen, so a 100%-Missing dimension is the finding (an
 * accessibility/data gap) and must stay colorable — its legend is a single "Missing"
 * row and the map paints every feature the missing color.
 */
export function computeFilterDimensions(
  features: Feature[],
  filterableTags: readonly string[] = FILTERABLE_TAGS,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): FilterDimension[] {
  return [
    ...computeTagDimensions(features, filterableTags, keepEmpty),
    computeAgeDimension(features),
  ];
}

/** One dimension per allow-listed tag, in list order. */
function computeTagDimensions(
  features: Feature[],
  filterableTags: readonly string[],
  keepEmpty: boolean
): FilterDimension[] {
  return filterableTags
    .map((key) => computeTagDimension(features, key))
    .filter((dim) => keepEmpty || dim.values.length > 0);
}

/**
 * Same keys in the same order — i.e. the template's filterableTags have not
 * been retuned since the snapshot. Order matters: it drives the legend's view
 * list, and computeTagDimensions emits one dimension per tag in list order.
 */
function sameTagKeys(
  dimensions: FilterDimension[],
  filterableTags: readonly string[]
): boolean {
  return (
    dimensions.length === filterableTags.length &&
    filterableTags.every((key, i) => dimensions[i].key === key)
  );
}

/**
 * Filter dimensions for the map legend, preferring the ones computed at
 * snapshot time (#499) over a client-side pass across every feature.
 *
 * Stored tag dimensions are used when their keys still match the template's
 * current `filterableTags`; a retuned template, or a dataset not yet
 * re-snapshotted, falls back to computing from features.
 *
 * Age counts stay live while the client holds the features, so they share one
 * `now` with the paint expressions. With no features — the vector-tile case
 * (#489), where the client only ever holds the viewport — the stored counts
 * are used instead and are frozen at snapshot time.
 */
export function resolveFilterDimensions(
  features: Feature[],
  filterableTags: readonly string[],
  stored?: FilterDimension[]
): FilterDimension[] {
  const storedTags = stored?.filter((d) => d.kind === "tag");
  const tagDimensions =
    storedTags && sameTagKeys(storedTags, filterableTags)
      ? storedTags
      : computeTagDimensions(features, filterableTags, true);

  const storedAge = stored?.find((d) => d.kind === "age");
  const ageDimension =
    features.length === 0 && storedAge ? storedAge : computeAgeDimension(features);

  return [...tagDimensions, ageDimension];
}
