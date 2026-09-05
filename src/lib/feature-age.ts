/**
 * Feature edit-age buckets shared by the map paint expressions, the legend
 * counts, and the age visibility filter.
 *
 * Features carry a numeric `_ts` (epoch seconds, stamped by
 * osm-data-processor.ts); the 7/30/90-day buckets are computed at render time
 * against `now`, so colours stay live even when `_ts` is baked into vector
 * tiles (#489).
 *
 * These are the map's buckets — deliberately distinct from the stats panel's
 * recency bands (dataset-recency.ts); do not unify them.
 */

export const AGE_TS_KEY = "_ts";

/** Fixed ordinal order for the buckets, oldest last. */
export const AGE_CATEGORY_ORDER = [
  "recent",
  "medium",
  "older",
  "very-old",
] as const;

export type AgeCategory = (typeof AGE_CATEGORY_ORDER)[number];
export type AgeCategoryValues<T> = Record<AgeCategory, T>;

const DAY_S = 86_400;

/**
 * Bucket a `_ts` value in JS, for legend counts. Missing or non-numeric values
 * fall back to "very-old", mirroring the step expression's coercion of missing
 * `_ts` to 0. Boundaries are inclusive (exactly 7 days old is still recent),
 * matching the step expression's `input >= stop` semantics.
 */
export function ageCategoryOfTs(ts: unknown, nowMs = Date.now()): AgeCategory {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "very-old";
  const ageDays = (nowMs / 1000 - ts) / DAY_S;
  if (ageDays <= 7) return "recent";
  if (ageDays <= 30) return "medium";
  if (ageDays <= 90) return "older";
  return "very-old";
}

/**
 * The one mapping from per-age values to a MapLibre step expression on `_ts`.
 * Collapses to the bare value when every bucket matches, so uniform paint
 * knobs cost nothing. Missing `_ts` coerces to 0 -> the very-old base value.
 */
export function ageStep<T>(
  values: AgeCategoryValues<T>,
  nowMs = Date.now()
): T | unknown[] {
  const veryOld = values["very-old"];
  if (
    values.recent === veryOld &&
    values.medium === veryOld &&
    values.older === veryOld
  ) {
    return veryOld;
  }
  const nowS = nowMs / 1000;
  return [
    "step",
    ["number", ["get", AGE_TS_KEY], 0],
    veryOld,
    nowS - 90 * DAY_S,
    values.older,
    nowS - 30 * DAY_S,
    values.medium,
    nowS - 7 * DAY_S,
    values.recent,
  ];
}
