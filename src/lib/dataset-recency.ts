/**
 * Recency bands: how an element's edit age maps to one of four buckets
 * (<=90d, 90d-1y, 1y-2y, 2y+), defined in one place so the server and the
 * dataset panel bucket identically.
 *
 * The server precomputes each dataset's band counts from its geojson and
 * persists them in `Dataset.stats` (dataset-snapshot.ts). The panel renders
 * those stored counts, falling back to computing them here from the geojson for
 * datasets saved before they were persisted (dataset-panel-stats.tsx). Sharing
 * the cutoffs and the accumulation is what lets the panel trust the stored
 * counts instead of reprocessing the geojson on every render.
 */
import type { Feature } from "geojson";

const DAY = 86_400_000;

// The bands in order — also the shape of the persisted count arrays (one entry
// each). Exclusive: a band covers ages above the previous bound up to its
// maxDays; the last is open-ended. `labelKey` is the DatasetPage i18n key.
export const RECENCY_BANDS = [
  { key: "upTo90d", maxDays: 90, labelKey: "band90d" },
  { key: "d90dTo1y", maxDays: 365, labelKey: "band90dTo1y" },
  { key: "d1yTo2y", maxDays: 730, labelKey: "band1yTo2y" },
  { key: "over2y", maxDays: Infinity, labelKey: "band2yPlus" },
] as const;

export function recencyBand(ageMs: number): number {
  const days = ageMs / DAY;
  return RECENCY_BANDS.findIndex((band) => days <= band.maxDays);
}

export interface RecencyBands {
  editRecencyBands: number[];
  mapperRecencyBands: number[];
}

// Bucket features by last-edit timestamp and mappers by their latest edit,
// reading the osmtogeojson `timestamp`/`user` properties. Features without a
// valid timestamp are skipped.
export function computeRecencyBands(
  features: Feature[],
  now: number = Date.now()
): RecencyBands {
  const editRecencyBands = RECENCY_BANDS.map(() => 0);
  const editorLatest = new Map<string, number>();

  for (const f of features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const tsRaw = props["timestamp"];
    if (typeof tsRaw !== "string") continue;
    const ts = Date.parse(tsRaw);
    if (Number.isNaN(ts)) continue;

    editRecencyBands[recencyBand(now - ts)]++;

    const user = props["user"];
    if (typeof user === "string") {
      const prev = editorLatest.get(user);
      if (prev === undefined || ts > prev) editorLatest.set(user, ts);
    }
  }

  const mapperRecencyBands = RECENCY_BANDS.map(() => 0);
  for (const ts of editorLatest.values())
    mapperRecencyBands[recencyBand(now - ts)]++;

  return { editRecencyBands, mapperRecencyBands };
}
