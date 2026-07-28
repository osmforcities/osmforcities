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

export function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return `${nf.format(0)} m`;
  if (km < 1) return `${nf.format(Math.round(km * 1000))} m`;
  return `${nf.format(round1(km))} km`;
}

// m² up to 1 km², then km² (avoids a seven-digit m² count at city scale).
// Hectares dropped — weak reader intuition; cf. iD, which keeps m² primary and
// shows ha only as a secondary hint. The m² count is the full grouped number
// (e.g. "145,000 m²" / "145.000 m²"), so there is no compact-notation kilo
// symbol to reconcile with the SI unit — the legend has room for it.
export function formatArea(km2: number, nf: Intl.NumberFormat): string {
  if (km2 <= 0) return `${nf.format(0)} m²`;
  if (km2 < 1) return `${nf.format(Math.round(km2 * 1_000_000))} m²`;
  return `${nf.format(round1(km2))} km²`;
}
