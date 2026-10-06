import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_SAVES_PER_USER } from "@/lib/constants";
import { POST } from "../route";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn(),
  getClientInfo: vi.fn(),
}));

const tx = {
  datasetSave: { count: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: { findUnique: vi.fn() },
    datasetSave: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

const post = (body?: unknown) =>
  POST(
    new NextRequest("http://localhost/api/datasets/ds-1/save", {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "ds-1" }) }
  );

const save = { id: "s1", userId: "u1", datasetId: "ds-1", createdAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue({ id: "ds-1" } as never);
  vi.mocked(prisma.datasetSave.findUnique).mockResolvedValue(null);
  tx.datasetSave.count.mockResolvedValue(0);
  tx.datasetSave.create.mockResolvedValue(save);
  vi.mocked(prisma.datasetSave.update).mockResolvedValue(save as never);
});

describe("POST /api/datasets/[id]/save", () => {
  it("saves with the notify flag when asked", async () => {
    const res = await post({ datasetId: "ds-1", notifyWhenReady: true });

    expect(res.status).toBe(200);
    expect(tx.datasetSave.create).toHaveBeenCalledWith({
      data: { userId: "u1", datasetId: "ds-1", notifyWhenReady: true },
    });
  });

  it("a plain save (no body) leaves the flag off", async () => {
    const res = await post();

    expect(res.status).toBe(200);
    expect(tx.datasetSave.create).toHaveBeenCalledWith({
      data: { userId: "u1", datasetId: "ds-1", notifyWhenReady: false },
    });
  });

  it("turns the flag on for an existing save without charging the quota", async () => {
    vi.mocked(prisma.datasetSave.findUnique).mockResolvedValue(save as never);

    const res = await post({ notifyWhenReady: true });

    expect(res.status).toBe(200);
    expect(prisma.datasetSave.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { notifyWhenReady: true },
    });
    expect(tx.datasetSave.create).not.toHaveBeenCalled();
  });

  it("a plain save of an already-saved dataset is still a 400", async () => {
    vi.mocked(prisma.datasetSave.findUnique).mockResolvedValue(save as never);

    const res = await post({ datasetId: "ds-1" });

    expect(res.status).toBe(400);
    expect(prisma.datasetSave.update).not.toHaveBeenCalled();
  });

  it("the quota applies unchanged", async () => {
    tx.datasetSave.count.mockResolvedValue(MAX_SAVES_PER_USER);

    const res = await post({ notifyWhenReady: true });

    expect(res.status).toBe(403);
    expect(tx.datasetSave.create).not.toHaveBeenCalled();
  });
});
