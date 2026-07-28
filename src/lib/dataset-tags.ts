/**
 * Tag counts: how many features carry each OSM tag key (presence, not value).
 *
 * Computed once server-side from a dataset's geojson and persisted in
 * `Dataset.stats` (dataset-snapshot.ts); the panel renders the stored counts (the
 * Critical-coverage and Most-used-tags lists) and never recomputes them, so the
 * Tags section stays hidden until a dataset is (re)snapshotted.
 *
 * Counts are template-agnostic: the template's query keys and its curated
 * filterable set are applied by the panel, not baked in here, so the stored data
 * stays correct if the template changes.
 */
import type { Feature } from "geojson";

// Property keys carried by osmtogeojson output that are NOT real OSM tags — the
// combined id, the "@"-prefixed internals, per-element metadata, and app-added
// fields. Mirrors the filters in feature-detail-panel.tsx so the counts cover
// only genuine tags.
const NON_TAG_KEYS = new Set([
  "id",
  "user",
  "timestamp",
  "version",
  "changeset",
  "ageCategory",
  "uid",
]);

export interface TagCount {
  key: string;
  count: number;
}

// Feature-presence count per tag key, sorted most-used first.
export function computeTagCounts(features: Feature[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const f of features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    for (const key in props) {
      if (key.startsWith("@") || NON_TAG_KEYS.has(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}
