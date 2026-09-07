import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getTileJob } from "@/lib/tiler/client";
import { reconcileDataset } from "@/lib/tiler/poll";
import { GET } from "../route";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tiler/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/client")>()),
  getTileJob: vi.fn(),
}));

vi.mock("@/lib/tiler/poll", () => ({
  reconcileDataset: vi.fn(),
}));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "ds-1",
  tilesJobId: "ds-1-100",
  tilesState: "pending",
  tilesError: null,
  ...overrides,
});

function get(id = "ds-1") {
  return GET(
    new NextRequest(`http://localhost:3000/api/datasets/${id}/tiles-status`),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/datasets/[id]/tiles-status", () => {
  it("404s on an unknown dataset", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null as never);
    const response = await get("nope");
    expect(response.status).toBe(404);
  });

  it("returns done for a dataset whose tiles are already pulled", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(
      row({ tilesState: "done" }) as never
    );
    expect(await (await get()).json()).toEqual({ state: "done" });
    expect(getTileJob).not.toHaveBeenCalled();
  });

  it("returns failed with tooLarge for a too_large-prefixed error", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(
      row({ tilesState: "failed", tilesError: "too_large: out of memory" }) as never
    );
    expect(await (await get()).json()).toEqual({
      state: "failed",
      error: "too_large: out of memory",
      tooLarge: true,
    });
  });

  it("returns failed without tooLarge for other errors", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(
      row({ tilesState: "failed", tilesError: "boom" }) as never
    );
    expect(await (await get()).json()).toEqual({
      state: "failed",
      error: "boom",
      tooLarge: false,
    });
  });

  it("returns none when no tile job exists", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(
      row({ tilesState: null, tilesJobId: null }) as never
    );
    expect(await (await get()).json()).toEqual({ state: "none" });
  });

  it("stays pending without touching the tiler when it is disabled", async () => {
    vi.stubEnv("TILER_URL", "");
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row() as never);
    expect(await (await get()).json()).toEqual({ state: "pending" });
    expect(getTileJob).not.toHaveBeenCalled();
  });

  it("reconciles a done job inline and reports done", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row() as never);
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(reconcileDataset).mockResolvedValue("completed");

    expect(await (await get()).json()).toEqual({ state: "done" });
    expect(reconcileDataset).toHaveBeenCalledWith(
      { id: "ds-1", tilesJobId: "ds-1-100" },
      { id: "ds-1-100", state: "done" }
    );
  });

  it("re-reads the recorded error when reconcile fails the job", async () => {
    vi.mocked(prisma.dataset.findUnique)
      .mockResolvedValueOnce(row() as never)
      .mockResolvedValueOnce(
        row({ tilesError: "too_large: refused" }) as never
      );
    vi.mocked(getTileJob).mockResolvedValue({
      id: "ds-1-100",
      state: "failed",
    });
    vi.mocked(reconcileDataset).mockResolvedValue("failed");

    expect(await (await get()).json()).toEqual({
      state: "failed",
      error: "too_large: refused",
      tooLarge: true,
    });
  });

  it("passes stage and progress through for a running job", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row() as never);
    vi.mocked(getTileJob).mockResolvedValue({
      id: "ds-1-100",
      state: "fetching",
      progress: { stage: "fetching", bytes: 1048576 },
    });
    vi.mocked(reconcileDataset).mockResolvedValue("pending");

    expect(await (await get()).json()).toEqual({
      state: "pending",
      stage: "fetching",
      progress: { stage: "fetching", bytes: 1048576 },
    });
  });

  it("treats a tiler error as transient and stays pending", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row() as never);
    vi.mocked(getTileJob).mockRejectedValue(new Error("ECONNREFUSED"));

    expect(await (await get()).json()).toEqual({ state: "pending" });
  });
});
