/**
 * Localization helpers for OSM-derived keys and values: curated tag keys and
 * values in the interactive map legend, and Nominatim address types in search.
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

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Fallback prettifier: "tactile_paving" -> "Tactile paving". */
export function toSentenceCase(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (!spaced) return raw;
  return capitalize(spaced);
}

/**
 * Fallback prettifier: "isolated_dwelling" -> "Isolated Dwelling". Used where the
 * neighbouring translated strings are Title Case (the AddressTypes badges), so a
 * sentence-cased fallback would read as a different kind of label.
 */
export function toTitleCase(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (!spaced) return raw;
  return spaced.split(" ").map(capitalize).join(" ");
}

/**
 * Localized label for a curated tag key (legend view dropdown). Falls back to a
 * title-cased key when no translation exists, so newly curated tags never render
 * a missing-key error.
 */
export function tagLabel(tTagLabel: MessageResolver, field: string): string {
  return tTagLabel.has(field) ? tTagLabel(field) : toSentenceCase(field);
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
