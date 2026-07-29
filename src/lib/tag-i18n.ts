/**
 * Localization helpers for curated OSM tag keys and values shown in the
 * interactive map legend.
 *
 * - Tag KEYS (legend view labels) resolve from the `TagLabel` namespace.
 * - Tag VALUES (legend category rows) resolve from the `TagValue` namespace with
 *   a fallback chain: `"<key>.<value>"` -> `"__common__.<value>"` (yes/no/limited)
 *   -> the raw value. Unbounded values (names, species, cuisine tail) and numbers
 *   (capacity) intentionally fall through to raw.
 *
 * The helpers take an already-scoped next-intl translator so they stay pure and
 * unit-testable, and keep the component body free of lookup logic.
 */

/**
 * Minimal structural view of a next-intl namespace translator. Tag keys/values
 * are resolved dynamically (from OSM data), which cannot be checked against
 * next-intl's strict literal message-key types — so callers pass their scoped
 * translator cast to this loose shape.
 */
export type MessageResolver = {
  (key: string): string;
  has(key: string): boolean;
};

/** Fallback prettifier: "tactile_paving" -> "Tactile paving". */
export function toTitleCase(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (!spaced) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Localized label for a curated tag key (legend view dropdown). Falls back to a
 * title-cased key when no translation exists, so newly curated tags never render
 * a missing-key error.
 */
export function tagLabel(tTagLabel: MessageResolver, field: string): string {
  return tTagLabel.has(field) ? tTagLabel(field) : toTitleCase(field);
}

/**
 * Localized label for a tag value (legend category row). Lookup is case-folded;
 * the raw value (dominant casing preserved by the caller) is the final fallback.
 */
export function tagValue(
  tTagValue: MessageResolver,
  field: string,
  value: string
): string {
  const folded = value.toLowerCase();
  const scoped = `${field}.${folded}`;
  if (tTagValue.has(scoped)) return tTagValue(scoped);
  const common = `__common__.${folded}`;
  if (tTagValue.has(common)) return tTagValue(common);
  return value;
}
