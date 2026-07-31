import { describe, it, expect } from "vitest";
import { STALE_THRESHOLD_MS, isFleetHealthy } from "../dataset-health";

const NOW = new Date("2026-07-31T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000);

describe("isFleetHealthy", () => {
  it("is healthy when the reference is within the cadence window", () => {
    expect(isFleetHealthy(hoursAgo(11), NOW)).toBe(true);
  });

  it("stays healthy across the idle stretch of a daily refresh cycle (25h < 30h)", () => {
    expect(isFleetHealthy(hoursAgo(25), NOW)).toBe(true);
  });

  it("is unhealthy once the reference ages past interval + grace (40h > 30h)", () => {
    expect(isFleetHealthy(hoursAgo(40), NOW)).toBe(false);
  });

  it("treats a null reference (nothing to judge) as healthy", () => {
    expect(isFleetHealthy(null, NOW)).toBe(true);
  });

  it("uses a 30h (24h interval + 6h grace) window", () => {
    expect(STALE_THRESHOLD_MS).toBe(30 * 60 * 60 * 1000);
  });
});
