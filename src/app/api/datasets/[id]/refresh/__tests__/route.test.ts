import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { submitTilesForDataset } from "@/lib/tiler/submit";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock("@/lib/dataset-snapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataset-snapshot")>()),
  fetchDatasetSnapshot: vi.fn().mockResolvedValue({ dataCount: 3 }),
  snapshotDatasetColumns: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/tiler/submit", () => ({ submitTilesForDataset: vi.fn() }));

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
    new NextRequest("http://localhost:3000/api/datasets/does-not-exist/refresh", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "does-not-exist" }) }
  );

describe("POST /api/datasets/[id]/refresh", () => {
  beforeEach(() => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null);
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
      where: { id: "does-not-exist" },
      include: expect.any(Object),
    });
  });

  describe("on a successful refresh", () => {
    const stored = { id: "ds-1", tilesState: "done", lastChecked: new Date() };

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(session(true));
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
        id: "ds-1",
        isActive: true,
        areaId: 1,
        templateId: "clocks",
        template: { overpassQuery: "q" },
      } as never);
      vi.mocked(prisma.dataset.update).mockResolvedValue(stored as never);
    });

    it("returns the tilesState the tile submit just recorded", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
        tilesJobId: "job-2",
        tilesState: "pending",
        tilesError: null,
      });
      const body = await (await call()).json();
      expect(body.tilesState).toBe("pending");
      expect(body.dataset.tilesState).toBe("pending");
    });

    it("falls back to the stored tilesState when the tiler is off", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({});
      const body = await (await call()).json();
      expect(body.tilesState).toBe("done");
    });
  });
});
