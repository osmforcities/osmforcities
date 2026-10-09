import { REFRESH_INTERVAL_HOURS } from "@/lib/dataset-health";

// How long a dataset waits before the update task retries it, by consecutive
// failures. Short first rungs absorb a blip; past them the daily floor is cheap
// enough that nothing ever gives up (health and the admin failed-bakes list
// cover "stuck").
const MINUTE_MS = 60 * 1000;
const DAILY_MS = REFRESH_INTERVAL_HOURS * 60 * MINUTE_MS;
const LADDER_MS = [15 * MINUTE_MS, 60 * MINUTE_MS, 6 * 60 * MINUTE_MS];
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

// A bare NOT on the nullable column would also drop rows with no tilesError.
export const NOT_TOO_LARGE = {
  OR: [
    { tilesError: null },
    { NOT: { tilesError: { startsWith: TOO_LARGE_PREFIX } } },
  ],
};

// An over-cap bake can outlast the short rungs; resubmitting mid-bake swaps
// tilesJobId and the running bake's result is discarded on arrival.
const NOT_BAKING = {
  OR: [{ tilesState: null }, { NOT: { tilesState: "pending" } }],
};

/**
 * Prisma filter for rows whose wait (retryWaitMs) has elapsed since
 * lastAttempted. One clause per rung, since the wait is per row.
 */
export function dueForRefreshWhere(now: Date) {
  const before = (ms: number) => ({ lt: new Date(now.getTime() - ms) });
  return {
    OR: [
      { lastAttempted: null },
      ...LADDER_MS.map((ms, i) => ({
        AND: [NOT_TOO_LARGE, NOT_BAKING],
        consecutiveFailures: i + 1,
        lastAttempted: before(ms),
      })),
      {
        ...NOT_TOO_LARGE,
        NOT: { consecutiveFailures: { gte: 1, lte: LADDER_MS.length } },
        lastAttempted: before(DAILY_MS),
      },
      {
        tilesError: { startsWith: TOO_LARGE_PREFIX },
        lastAttempted: before(TOO_LARGE_WAIT_MS),
      },
    ],
  };
}
