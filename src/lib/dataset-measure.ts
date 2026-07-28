/**
 * Human-readable length/area formatting for the dataset panel's geometry mix.
 * Pure (only `Intl.NumberFormat`) so it stays unit-testable and free of React /
 * next-intl. Numbers are locale-formatted; the SI symbols (m, km, m², km²) are
 * appended as literals — Intl `style:"unit"` can't render m²/km² because
 * square-meter and square-kilometer aren't ECMA-402-sanctioned unit identifiers
 * (they throw).
 */

function round1(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

/**
 * Compact integer with SI-consistent kilo casing. CLDR compact renders
 * thousands as uppercase "K" in English, but SI kilo is lowercase "k"; since the
 * count is paired with an SI unit (m²), normalize the kilo symbol to lowercase.
 * Mega ("M") already matches SI and stays uppercase; word abbreviations
 * (pt-BR / es "mil") carry no "K" and are unaffected.
 */
function compactWithSiKilo(value: number, locale: string): string {
  const nf = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return nf
    .formatToParts(value)
    .map((part) =>
      part.type === "compact" && part.value === "K" ? "k" : part.value
    )
    .join("");
}

export function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return `0 m`;
  if (km < 1) return `${nf.format(Math.round(km * 1000))} m`;
  return `${nf.format(round1(km))} km`;
}

// m² up to 1 km², then km² (avoids "500M m²" at city scale). Hectares dropped —
// weak reader intuition; cf. iD, which keeps m² primary and shows ha only as a
// secondary hint. Footprint m² uses compact digits (105k / 105 mil), built in
// the same locale as `nf`.
export function formatArea(km2: number, nf: Intl.NumberFormat): string {
  if (km2 <= 0) return `0 m²`;
  if (km2 < 1) {
    return `${compactWithSiKilo(Math.round(km2 * 1_000_000), nf.resolvedOptions().locale)} m²`;
  }
  return `${nf.format(round1(km2))} km²`;
}
