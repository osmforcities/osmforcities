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
      updateMany: vi.fn(),
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
  vi.mocked(prisma.dataset.updateMany).mock.calls[call][0].data as Record<
    string,
    unknown
  >;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
  vi.mocked(prisma.dataset.findMany).mockResolvedValue([pendingRow] as never);
  vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 1 } as never);
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
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
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
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
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
    expect(second).toEqual({ outcome: "pending" });

    release();
    expect(await first).toEqual({ outcome: "completed" });
    expect(downloadTileOutputs).toHaveBeenCalledTimes(1);
  });

  it("a stale reconcile never clobbers a committed outcome", async () => {
    // The lost race: this caller read the row while pending, but a concurrent
    // reconcile finished the job (wrote done, acked — so the lookup 404s)
    // before this one committed. The conditional write matches 0 rows.
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({
      count: 0,
    } as never);

    expect(await reconcileDataset(pendingRow, null)).toEqual({
      outcome: "pending",
    });
    expect(
      await reconcileDataset(pendingRow, { id: "ds-1-100", state: "failed" })
    ).toEqual({ outcome: "pending" });
    expect(
      await reconcileDataset(pendingRow, { id: "ds-1-100", state: "done" })
    ).toEqual({ outcome: "pending" });
    // The loser of the done-race must not ack or prune — the winner does.
    expect(ackTileJob).not.toHaveBeenCalled();
    expect(pruneTileArchives).not.toHaveBeenCalled();
    // Every write went through the conditional guard.
    for (const call of vi.mocked(prisma.dataset.updateMany).mock.calls) {
      expect(call[0].where).toEqual({
        id: "ds-1",
        tilesJobId: "ds-1-100",
        tilesState: "pending",
      });
    }
  });

  it("a failed download leaves the row pending for the next tick", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(downloadTileOutputs).mockRejectedValue(new Error("disk full"));

    const results = await pollPendingTileJobs();

    expect(results.stillPending).toBe(1);
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
    expect(ackTileJob).not.toHaveBeenCalled();
  });
});
