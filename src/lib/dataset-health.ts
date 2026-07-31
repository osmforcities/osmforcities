// Shared dataset-fleet freshness thresholds and health verdict, used by both
// the /api/health endpoint and the admin dataset-updates page so the two can't
// drift apart.
//
// The update-datasets cron refreshes each dataset on roughly this cadence (a
// dataset becomes eligible once its lastAttempted is older than the interval;
// see api/tasks/update-datasets). The fleet refreshes in a daily burst then
// sits idle, so a healthy system only produces a *successful* check about once
// per interval — health must be judged against that cadence, not a tighter one.
export const REFRESH_INTERVAL_HOURS = 24;
// Grace on top of the interval before we call the pipeline stalled: absorbs the
// idle gap between bursts plus cron/Overpass jitter. Peak healthy age of the
// newest successful check is ~the idle gap (< interval); this margin keeps a
// healthy idle stretch from tripping a false alarm.
export const GRACE_HOURS = 6;
export const STALE_THRESHOLD_MS =
  (REFRESH_INTERVAL_HOURS + GRACE_HOURS) * 60 * 60 * 1000;

/**
 * Is the dataset fleet healthy, given a reference date (the newest successful
 * check across active datasets, or a fresh-instance fallback)? A null reference
 * means there is nothing to judge (no active datasets) and reads as healthy.
 */
export function isFleetHealthy(
  reference: Date | null,
  now: number = Date.now()
): boolean {
  if (reference === null) return true;
  return reference.getTime() >= now - STALE_THRESHOLD_MS;
}
