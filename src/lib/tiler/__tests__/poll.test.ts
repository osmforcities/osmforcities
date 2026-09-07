import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTileJob,
  downloadTileOutputs,
  ackTileJob,
  pruneTileArchives,
} from "@/lib/tiler/client";
import { pollPendingTileJobs, reconcileDataset } from "@/lib/tiler/poll";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tiler/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/client")>()),
  getTileJob: vi.fn(),
  downloadTileOutputs: vi.fn(),
  ackTileJob: vi.fn(),
  pruneTileArchives: vi.fn(),
}));

const pendingRow = { id: "ds-1", tilesJobId: "ds-1-100" };

const updateData = (call: number) =>
  vi.mocked(prisma.dataset.update).mock.calls[call][0].data as Record<
    string,
    unknown
  >;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
  vi.mocked(prisma.dataset.findMany).mockResolvedValue([pendingRow] as never);
  vi.mocked(prisma.dataset.update).mockResolvedValue({} as never);
  vi.mocked(downloadTileOutputs).mockResolvedValue(undefined);
  vi.mocked(ackTileJob).mockResolvedValue(undefined);
  vi.mocked(pruneTileArchives).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pollPendingTileJobs", () => {
  it("does nothing when the tiler is disabled", async () => {
    vi.stubEnv("TILER_URL", "");
    const results = await pollPendingTileJobs();
    expect(results.checked).toBe(0);
    expect(prisma.dataset.findMany).not.toHaveBeenCalled();
  });

  it("pulls, records, acks and prunes a done job", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });

    const results = await pollPendingTileJobs();

    expect(results).toEqual({
      checked: 1,
      completed: 1,
      failed: 0,
      stillPending: 0,
    });
    expect(downloadTileOutputs).toHaveBeenCalledWith("ds-1-100");
    expect(updateData(0)).toMatchObject({
      tilesState: "done",
      tilesError: null,
    });
    expect(updateData(0).tilesUpdatedAt).toBeInstanceOf(Date);
    expect(ackTileJob).toHaveBeenCalledWith("ds-1-100");
    expect(pruneTileArchives).toHaveBeenCalledWith("ds-1");
  });

  it("records a failed job with its errorKind prefix", async () => {
    vi.mocked(getTileJob).mockResolvedValue({
      id: "ds-1-100",
      state: "failed",
      error: "runtime error: out of memory",
      errorKind: "too_large",
    });

    const results = await pollPendingTileJobs();

    expect(results.failed).toBe(1);
    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "too_large: runtime error: out of memory",
    });
    expect(downloadTileOutputs).not.toHaveBeenCalled();
  });

  it("marks a swept (404) job failed so the next snapshot resubmits", async () => {
    vi.mocked(getTileJob).mockResolvedValue(null);

    const results = await pollPendingTileJobs();

    expect(results.failed).toBe(1);
    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "job expired before pull",
    });
  });

  it("leaves running jobs pending", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "baking" });

    const results = await pollPendingTileJobs();

    expect(results.stillPending).toBe(1);
    expect(prisma.dataset.update).not.toHaveBeenCalled();
  });

  it("treats a transient error (tiler unreachable) as still pending", async () => {
    vi.mocked(getTileJob).mockRejectedValue(new Error("ECONNREFUSED"));

    const results = await pollPendingTileJobs();

    expect(results).toEqual({
      checked: 1,
      completed: 0,
      failed: 0,
      stillPending: 1,
    });
    expect(prisma.dataset.update).not.toHaveBeenCalled();
  });

  it("never throws — a failing pending-datasets query returns empty results", async () => {
    vi.mocked(prisma.dataset.findMany).mockRejectedValue(new Error("db blip"));

    const results = await pollPendingTileJobs();

    expect(results).toEqual({
      checked: 0,
      completed: 0,
      failed: 0,
      stillPending: 0,
    });
    expect(getTileJob).not.toHaveBeenCalled();
  });

  it("a concurrent reconcile of the same job downloads once (second stays pending)", async () => {
    let release!: () => void;
    vi.mocked(downloadTileOutputs).mockImplementation(
      () => new Promise((resolve) => (release = () => resolve(undefined)))
    );
    const job = { id: "ds-1-100", state: "done" as const };

    const first = reconcileDataset(pendingRow, job);
    const second = await reconcileDataset(pendingRow, job);
    expect(second).toBe("pending");

    release();
    expect(await first).toBe("completed");
    expect(downloadTileOutputs).toHaveBeenCalledTimes(1);
  });

  it("a failed download leaves the row pending for the next tick", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(downloadTileOutputs).mockRejectedValue(new Error("disk full"));

    const results = await pollPendingTileJobs();

    expect(results.stillPending).toBe(1);
    expect(prisma.dataset.update).not.toHaveBeenCalled();
    expect(ackTileJob).not.toHaveBeenCalled();
  });
});
