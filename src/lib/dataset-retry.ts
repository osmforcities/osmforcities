import { REFRESH_INTERVAL_HOURS } from "@/lib/dataset-health";
import { SIZE_CHECK_TIMEOUT_TTL_MINUTES } from "@/lib/constants";

// How long a dataset waits before the update task retries it, by consecutive
// failures. Short first rungs absorb a blip; past them the daily floor is cheap
// enough that nothing ever gives up (health and the admin failed-bakes list
// cover "stuck").
const MINUTE_MS = 60 * 1000;
const DAILY_MS = REFRESH_INTERVAL_HOURS * 60 * MINUTE_MS;
const LADDER_MS = [15 * MINUTE_MS, 60 * MINUTE_MS, 6 * 60 * MINUTE_MS];
// Outlasts the slowest probe (default timeout plus the raised-budget retry)
const COUNT_PROBE_BUDGET_MS = 10 * MINUTE_MS;
// A too-large refusal is near-permanent, but a reverted bad import can bring
// the area back under the ceiling, so it is retried weekly rather than never.
const TOO_LARGE_WAIT_MS = 7 * 24 * 60 * MINUTE_MS;

// reconcileDataset prefixes the tiler's errorKind onto tilesError.
const TOO_LARGE_PREFIX = "too_large:";

export function isTooLarge(tilesError: string | null): boolean {
  return tilesError?.startsWith(TOO_LARGE_PREFIX) ?? false;
}

export function retryWaitMs(
  consecutiveFailures: number,
  tilesError: string | null
): number {
  if (isTooLarge(tilesError)) return TOO_LARGE_WAIT_MS;
  return LADDER_MS[consecutiveFailures - 1] ?? DAILY_MS;
}

/** In-memory twin of dueForRefreshWhere's wait. */
export function isRetryDue(
  row: {
    lastAttempted: Date | null;
    consecutiveFailures: number;
    tilesError: string | null;
  },
  now: Date
): boolean {
  if (!row.lastAttempted) return true;
  return (
    now.getTime() - row.lastAttempted.getTime() >
    retryWaitMs(row.consecutiveFailures, row.tilesError)
  );
}

// A failed probe waits out the verdict it recorded, or the next one would only read it back
export function isCountProbeDue(
  row: {
    tilesState: string | null;
    lastAttempted: Date | null;
    consecutiveFailures: number;
  },
  now: Date
): boolean {
  if (row.tilesState !== "counting") return false;
  if (!row.lastAttempted) return true;
  const waitMs =
    row.consecutiveFailures > 0
      ? SIZE_CHECK_TIMEOUT_TTL_MINUTES * MINUTE_MS
      : COUNT_PROBE_BUDGET_MS;
  return now.getTime() - row.lastAttempted.getTime() > waitMs;
}

// A bare NOT on the nullable column would also drop rows with no tilesError.
export const NOT_TOO_LARGE = {
  OR: [
    { tilesError: null },
    { NOT: { tilesError: { startsWith: TOO_LARGE_PREFIX } } },
  ],
};

// Resubmitting mid-bake swaps tilesJobId and the running bake's result is
// discarded on arrival. A pending row with no tilesJobId never reaches
// reconcile, so it stays due or it would be stuck. Guarded per clause: the
// cron spreads this filter next to CATALOG_FILTER's own AND.
const NO_BAKE_IN_FLIGHT = {
  OR: [
    { tilesState: null },
    { NOT: { tilesState: "pending" } },
    { tilesJobId: null },
  ],
};

/**
 * Prisma filter for rows whose wait (retryWaitMs) has elapsed since
 * lastAttempted. One clause per rung, since the wait is per row.
 */
export function dueForRefreshWhere(now: Date) {
  const before = (ms: number) => ({ lt: new Date(now.getTime() - ms) });
  return {
    OR: [
      { AND: [NO_BAKE_IN_FLIGHT], lastAttempted: null },
      {
        AND: [NO_BAKE_IN_FLIGHT],
        tilesState: "counting",
        consecutiveFailures: 0,
        lastAttempted: before(COUNT_PROBE_BUDGET_MS),
      },
      ...LADDER_MS.map((ms, i) => ({
        AND: [NOT_TOO_LARGE, NO_BAKE_IN_FLIGHT],
        consecutiveFailures: i + 1,
        lastAttempted: before(ms),
      })),
      {
        AND: [NOT_TOO_LARGE, NO_BAKE_IN_FLIGHT],
        NOT: { consecutiveFailures: { gte: 1, lte: LADDER_MS.length } },
        lastAttempted: before(DAILY_MS),
      },
      {
        AND: [NO_BAKE_IN_FLIGHT],
        tilesError: { startsWith: TOO_LARGE_PREFIX },
        lastAttempted: before(TOO_LARGE_WAIT_MS),
      },
    ],
  };
}
