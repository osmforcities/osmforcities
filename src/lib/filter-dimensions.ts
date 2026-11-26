import { AGE_CATEGORY_ORDER } from "./feature-age";

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

/** @param counts one per AGE_CATEGORY_ORDER bucket, as the tiler bakes them */
export function ageDimensionFromCounts(counts: readonly number[]): FilterDimension {
  const values: FilterDimensionValue[] = AGE_CATEGORY_ORDER.map((value, i) => ({
    value,
    count: counts[i],
  })).filter((v) => v.count > 0);

  return { key: "age", kind: "age", values, missing: 0 };
}

// Order counts too: it drives the legend's view list
function sameTagKeys(
  dimensions: FilterDimension[],
  filterableTags: readonly string[]
): boolean {
  return (
    dimensions.length === filterableTags.length &&
    filterableTags.every((key, i) => dimensions[i].key === key)
  );
}

/** A template retuned since the last bake gets one empty dimension per current tag until the next. */
export function resolveFilterDimensions(
  filterableTags: readonly string[],
  stored?: FilterDimension[]
): FilterDimension[] {
  const storedTags = stored?.filter((d) => d.kind === "tag");
  const tagDimensions =
    storedTags && sameTagKeys(storedTags, filterableTags)
      ? storedTags
      : filterableTags.map(
          (key): FilterDimension => ({ key, kind: "tag", values: [], missing: 0 })
        );

  return [
    ...tagDimensions,
    stored?.find((d) => d.kind === "age") ?? ageDimensionFromCounts([]),
  ];
}
