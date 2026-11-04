import { describe, it, expect } from "vitest";
import { dueForRefreshWhere, isRetryDue, retryWaitMs } from "../dataset-retry";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("isRetryDue", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const row = (agoMs: number | null, consecutiveFailures: number, tilesError: string | null = null) => ({
    lastAttempted: agoMs === null ? null : new Date(now.getTime() - agoMs),
    consecutiveFailures,
    tilesError,
  });

  it("is due when the row was never attempted", () => {
    expect(isRetryDue(row(null, 0), now)).toBe(true);
  });

  it("follows the ladder from lastAttempted", () => {
    expect(isRetryDue(row(14 * MIN, 1), now)).toBe(false);
    expect(isRetryDue(row(16 * MIN, 1), now)).toBe(true);
    expect(isRetryDue(row(59 * MIN, 2), now)).toBe(false);
    expect(isRetryDue(row(61 * MIN, 2), now)).toBe(true);
  });

  it("keeps the weekly wait after a too-large refusal", () => {
    expect(isRetryDue(row(6 * DAY, 1, "too_large: out of memory"), now)).toBe(false);
    expect(isRetryDue(row(8 * DAY, 1, "too_large: out of memory"), now)).toBe(true);
  });
});

describe("retryWaitMs", () => {
  it("keeps the daily cadence for a healthy row", () => {
    expect(retryWaitMs(0, null)).toBe(DAY);
  });

  it("climbs the ladder: 15 min, 1 h, 6 h", () => {
    expect(retryWaitMs(1, null)).toBe(15 * MIN);
    expect(retryWaitMs(2, "job failed")).toBe(HOUR);
    expect(retryWaitMs(3, null)).toBe(6 * HOUR);
  });

  it("settles on daily above three failures, never giving up", () => {
    expect(retryWaitMs(4, null)).toBe(DAY);
    expect(retryWaitMs(50, "job failed")).toBe(DAY);
  });

  it("waits a week after a too-large refusal, whatever the count", () => {
    expect(retryWaitMs(1, "too_large: out of memory")).toBe(7 * DAY);
    expect(retryWaitMs(9, "too_large: out of memory")).toBe(7 * DAY);
  });
});

describe("dueForRefreshWhere", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("has one clause per wait, each cut off at now minus that wait", () => {
    const { OR } = dueForRefreshWhere(now);
    const cutoffs = OR.flatMap((c) =>
      c.lastAttempted && "lt" in c.lastAttempted
        ? [(c.lastAttempted.lt as Date).getTime()]
        : []
    ).sort();
    expect(cutoffs).toEqual(
      [ago(7 * DAY), ago(DAY), ago(6 * HOUR), ago(HOUR), ago(15 * MIN)].map(
        (d) => d.getTime()
      )
    );
    expect(OR.some((c) => c.lastAttempted === null)).toBe(true);
  });

  it("keeps rows with a null tilesError in the ladder clauses", () => {
    // A bare NOT on a nullable column drops NULL rows in SQL.
    const rung = dueForRefreshWhere(now).OR.find(
      (c) => "consecutiveFailures" in c && c.consecutiveFailures === 1
    );
    expect(JSON.stringify(rung)).toContain('{"tilesError":null}');
  });

  it("never refreshes a row whose bake is still pending, on any clause", () => {
    const { OR } = dueForRefreshWhere(now);
    expect(OR).toHaveLength(6);
    for (const clause of OR) {
      expect(JSON.stringify(clause)).toContain(
        '{"OR":[{"tilesState":null},{"NOT":{"tilesState":"pending"}},{"tilesJobId":null}]}'
      );
    }
  });
});
