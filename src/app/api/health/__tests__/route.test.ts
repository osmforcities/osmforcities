import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findFirst: vi.fn(), count: vi.fn() } },
}));

vi.mock("@/lib/tiler/client", () => ({ tilerDownForMs: vi.fn() }));
import { tilerDownForMs } from "@/lib/tiler/client";

import { GET } from "../route";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.dataset.count).mockResolvedValue(0);
    vi.mocked(tilerDownForMs).mockReturnValue(0);
  });

  const freshFleet = () =>
    vi.mocked(prisma.dataset.findFirst).mockResolvedValueOnce({
      lastChecked: hoursAgo(1),
    } as never);

  it("degrades when more than 5 datasets sit above three failures, and clears on recovery", async () => {
    freshFleet();
    vi.mocked(prisma.dataset.count).mockResolvedValueOnce(6);

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      reason: "datasets failing repeatedly",
    });
    // Too-large rows retry weekly by design and must not hold health down.
    const where = vi.mocked(prisma.dataset.count).mock.calls[0][0]?.where;
    expect(where).toMatchObject({
      isActive: true,
      consecutiveFailures: { gt: 3 },
    });
    expect(JSON.stringify(where)).toContain("too_large:");

    freshFleet();
    vi.mocked(prisma.dataset.count).mockResolvedValueOnce(5);
    const recovered = await GET();
    expect(recovered.status).toBe(200);
  });

  it("degrades when the tiler has been unreachable for over 30 minutes", async () => {
    freshFleet();
    vi.mocked(tilerDownForMs).mockReturnValue(31 * 60 * 1000);

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: "tiler unreachable" });

    freshFleet();
    vi.mocked(tilerDownForMs).mockReturnValue(29 * 60 * 1000);
    expect((await GET()).status).toBe(200);
  });

  it("joins every reason that applies", async () => {
    vi.mocked(prisma.dataset.findFirst).mockResolvedValueOnce({
      lastChecked: hoursAgo(40),
    } as never);
    vi.mocked(tilerDownForMs).mockReturnValue(60 * 60 * 1000);

    expect(await (await GET()).json()).toMatchObject({
      reason: "datasets not updating; tiler unreachable",
    });
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
