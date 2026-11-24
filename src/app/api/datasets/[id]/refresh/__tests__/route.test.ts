import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { probeElementCount } from "@/lib/overpass/count-probe";
import {
  recordFailedSubmit,
  submitTilesForDataset,
} from "@/lib/tiler/submit";
import { tilerEnabled } from "@/lib/tiler/client";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock("@/lib/overpass/count-probe", () => ({
  probeElementCount: vi.fn(),
}));

vi.mock("@/lib/tiler/client", () => ({
  tilerEnabled: vi.fn(),
}));

vi.mock("@/lib/tiler/submit", () => ({
  recordFailedSubmit: vi.fn(),
  submitTilesForDataset: vi.fn(),
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn(),
  getClientInfo: vi.fn(),
}));

import { POST } from "../route";

type Session = Awaited<ReturnType<typeof auth>>;

const session = (isAdmin: boolean | null): Session =>
  isAdmin === null
    ? null
    : ({
        user: { id: "user-1", email: "user@test.com", isAdmin },
      } as unknown as Session);

const call = () =>
  POST(
    new NextRequest("http://localhost:3000/api/datasets/ds-1/refresh", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "ds-1" }) }
  );

describe("POST /api/datasets/[id]/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null);
    vi.mocked(tilerEnabled).mockReturnValue(true);
    vi.mocked(probeElementCount).mockResolvedValue(3);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(null));
    const res = await call();
    expect(res.status).toBe(401);
    expect(prisma.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users (no dataset lookup)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(false));
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden");
    expect(prisma.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("lets admins past the gate to the dataset lookup (404 for a missing dataset)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(true));
    const res = await call();
    expect(res.status).toBe(404);
    expect(prisma.dataset.findUnique).toHaveBeenCalledOnce();
    expect(prisma.dataset.findUnique).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      select: expect.any(Object),
    });
  });

  describe("for an admin on an active dataset", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(session(true));
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
        isActive: true,
        areaId: 1,
        templateId: "clocks",
        template: { overpassQuery: "q" },
      } as never);
    });

    it("answers 503 and touches nothing when no tiler is configured", async () => {
      vi.mocked(tilerEnabled).mockReturnValue(false);

      const res = await call();

      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe(
        "Cannot refresh: no tiler is configured"
      );
      expect(prisma.dataset.update).not.toHaveBeenCalled();
      expect(probeElementCount).not.toHaveBeenCalled();
      expect(submitTilesForDataset).not.toHaveBeenCalled();
    });

    it("submits a bake sized by the probe and reports it queued", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
        tilesJobId: "job-2",
        tilesState: "pending",
        tilesError: null,
      });
      const res = await call();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, tilesState: "pending" });
      expect(probeElementCount).toHaveBeenCalledWith(1, "q", "clocks");
      // The probe count sizes the bake but is not stored
      expect(submitTilesForDataset).toHaveBeenCalledWith("ds-1", 3);
      // Only the attempt is recorded, so the cron does not resubmit over it
      expect(prisma.dataset.update).toHaveBeenCalledOnce();
      expect(prisma.dataset.update).toHaveBeenCalledWith({
        where: { id: "ds-1" },
        data: { lastAttempted: expect.any(Date) },
      });
    });

    it("reports an empty dataset synced, with no bake to queue", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
        tilesJobId: null,
        tilesState: null,
        tilesError: null,
      });
      const res = await call();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, tilesState: null });
    });

    it("fails when the submit threw before recording anything", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({});
      const res = await call();
      expect(res.status).toBe(502);
      expect(recordFailedSubmit).not.toHaveBeenCalled();
    });

    it("fails when the bake could not be queued", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
        tilesState: "failed",
        tilesError: "Tiler submit failed: 503",
      });
      const res = await call();
      expect(res.status).toBe(502);
      // The raw tiler message is operator-only
      expect(JSON.stringify(await res.json())).not.toContain("503");
      expect(recordFailedSubmit).toHaveBeenCalledWith(
        "ds-1",
        "Tiler submit failed: 503"
      );
    });

    it("answers 500 without the raw error when the count probe fails", async () => {
      vi.mocked(probeElementCount).mockRejectedValueOnce(
        new Error("Overpass API error: 500")
      );
      const res = await call();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Failed to refresh dataset data" });
      expect(submitTilesForDataset).not.toHaveBeenCalled();
    });
  });
});
