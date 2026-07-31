import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findFirst: vi.fn() } },
}));

import { GET } from "../route";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is ok when the newest successful check is within the cadence window", async () => {
    vi.mocked(prisma.dataset.findFirst).mockResolvedValueOnce({
      lastChecked: hoursAgo(11),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("stays ok across the idle stretch of a normal daily refresh cycle", async () => {
    // Fleet refreshes in a burst then idles; the newest successful check ages
    // toward the interval before the next burst. This must NOT read as degraded.
    vi.mocked(prisma.dataset.findFirst).mockResolvedValueOnce({
      lastChecked: hoursAgo(25),
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("degrades when nothing has refreshed past interval + grace (e.g. Overpass down)", async () => {
    // Overpass outage: cron keeps attempting but every refresh fails, so no
    // lastChecked advances and the newest success ages out.
    vi.mocked(prisma.dataset.findFirst).mockResolvedValueOnce({
      lastChecked: hoursAgo(40),
    } as never);

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      reason: "datasets not updating",
    });
  });

  it("does not degrade on a fresh instance whose datasets have not run a first cycle", async () => {
    // No successful check yet; oldest active dataset was created recently.
    vi.mocked(prisma.dataset.findFirst)
      .mockResolvedValueOnce(null as never) // newest lastChecked
      .mockResolvedValueOnce({ createdAt: hoursAgo(1) } as never); // oldest active

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("degrades when datasets have existed past the window but never succeeded", async () => {
    vi.mocked(prisma.dataset.findFirst)
      .mockResolvedValueOnce(null as never) // newest lastChecked
      .mockResolvedValueOnce({ createdAt: hoursAgo(40) } as never); // oldest active

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded" });
  });

  it("is ok when there are no active datasets", async () => {
    vi.mocked(prisma.dataset.findFirst)
      .mockResolvedValueOnce(null as never) // newest lastChecked
      .mockResolvedValueOnce(null as never); // oldest active

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("degrades with 'database unavailable' when the query throws", async () => {
    vi.mocked(prisma.dataset.findFirst).mockRejectedValue(new Error("boom"));

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      reason: "database unavailable",
    });
  });
});
