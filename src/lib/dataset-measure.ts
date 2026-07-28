/**
 * Human-readable length/area formatting for the dataset panel's geometry mix.
 * Pure (only `Intl.NumberFormat`) so it stays unit-testable and free of React /
 * next-intl. Numbers are locale-formatted; the SI symbols (m, km, m², km²) are
 * appended as literals — Intl `style:"unit"` can't render m²/km² because
 * square-meter and square-kilometer aren't ECMA-402-sanctioned unit identifiers
 * (they throw).
 *
 * Each measure is wrapped in a Unicode LTR isolate (U+2066 … U+2069). An SI
 * quantity — locale digits followed by a Latin unit symbol — reads
 * left-to-right in every locale, so in an RTL locale (Arabic/Hebrew/Persian,
 * planned) the isolate keeps the number and its unit together and correctly
 * ordered instead of letting the bidi algorithm reflow the Latin unit or
 * detach the ² superscript. Zero also goes through `nf` so non-Latin-digit
 * locales get a localized zero. The isolate chars are invisible and inert in
 * the LTR locales shipping today.
 */

const LRI = String.fromCharCode(0x2066); // LEFT-TO-RIGHT ISOLATE
const PDI = String.fromCharCode(0x2069); // POP DIRECTIONAL ISOLATE

function ltrIsolate(measure: string): string {
  return `${LRI}${measure}${PDI}`;
}

function round1(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

export function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return ltrIsolate(`${nf.format(0)} m`);
  if (km < 1) return ltrIsolate(`${nf.format(Math.round(km * 1000))} m`);
  return ltrIsolate(`${nf.format(round1(km))} km`);
}

// m² up to 1 km², then km² (avoids a seven-digit m² count at city scale).
// Hectares dropped — weak reader intuition; cf. iD, which keeps m² primary and
// shows ha only as a secondary hint. The m² count is the full grouped number
// (e.g. "145,000 m²" / "145.000 m²"), so there is no compact-notation kilo
// symbol to reconcile with the SI unit — the legend has room for it.
export function formatArea(km2: number, nf: Intl.NumberFormat): string {
  if (km2 <= 0) return ltrIsolate(`${nf.format(0)} m²`);
  if (km2 < 1) return ltrIsolate(`${nf.format(Math.round(km2 * 1_000_000))} m²`);
  return ltrIsolate(`${nf.format(round1(km2))} km²`);
}
