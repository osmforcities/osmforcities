import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTileJob,
  downloadTileOutputs,
  ackTileJob,
  pruneTileArchives,
} from "@/lib/tiler/client";
import { readPulledStats } from "@/lib/tiler/stats";
import { pollPendingTileJobs, reconcileDataset } from "@/lib/tiler/poll";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

// Keep the mapper real; only the file read is stubbed.
vi.mock("@/lib/tiler/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/stats")>()),
  readPulledStats: vi.fn(),
}));

const pendingRow = { id: "ds-1", tilesJobId: "ds-1-100" };

// A schemaVersion-1 blob carrying every field DatasetStatsSchema requires.
const tilerStats = {
  schemaVersion: 1,
  recencyBandsDays: [90, 365, 730],
  features: 42,
  nodes: 0,
  ways: 42,
  relations: 0,
  editorsCount: 3,
  changesetsCount: 4,
  elementVersionsCount: 9,
  oldestElement: "2020-01-01T00:00:00Z",
  mostRecentElement: "2026-01-01T00:00:00Z",
  averageElementAge: 100,
  averageElementVersion: 2,
  recentActivity: { elementsEdited: 5, changesets: 2, editors: 2 },
  qualityMetrics: {
    staleElementsCount: 1,
    recentlyUpdatedElementsCount: 5,
    staleElementsPercentage: 2.38,
    recentlyUpdatedElementsPercentage: 11.9,
  },
  editRecencyBands: [1, 1, 1, 39],
  mapperRecencyBands: [1, 0, 0, 2],
  tagCounts: [{ key: "building", count: 42 }],
  filterDimensions: [],
  geometryMix: { points: 0, lines: 0, areas: 42, lineKm: 0, areaKm2: 1 },
  bbox: [1, 2, 3, 4],
  seconds: 1.5,
  peakRssMB: 120,
};

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
  // Non-null stored stats: the done branch skips the tiler stats fill.
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
    stats: {},
  } as never);
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
    // A dataset the app fetched keeps its own stats — the tiler's are ignored.
    expect(updateData(0).stats).toBeUndefined();
    expect(ackTileJob).toHaveBeenCalledWith("ds-1-100");
    expect(pruneTileArchives).toHaveBeenCalledWith("ds-1");
  });

  it("fills stats from the tiler's stats.json for tiles-only datasets", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue(tilerStats);

    const results = await pollPendingTileJobs();

    expect(results.completed).toBe(1);
    const data = updateData(0);
    expect(data.tilesState).toBe("done");
    expect(data.dataCount).toBe(42);
    expect(data.contributorsCount).toBe(3);
    expect(data.recentlyEditedCount).toBe(5);
    expect(data.bbox).toEqual([1, 2, 3, 4]);
    expect(data.lastEditedAt).toEqual(new Date("2026-01-01T00:00:00Z"));

    const stats = data.stats as Record<string, unknown>;
    expect(stats.tagCounts).toEqual([{ key: "building", count: 42 }]);
    expect(stats.editRecencyBands).toEqual([1, 1, 1, 39]);
    expect(stats.mostRecentElement).toBe("2026-01-01T00:00:00.000Z");
    // Tiler-internal fields have no column and must not reach the blob.
    expect(stats.schemaVersion).toBeUndefined();
    expect(stats.features).toBeUndefined();
    expect(stats.peakRssMB).toBeUndefined();
  });

  it("skips the stats fill on an unknown schemaVersion", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      schemaVersion: 2,
    });

    const results = await pollPendingTileJobs();

    expect(results.completed).toBe(1);
    expect(updateData(0).tilesState).toBe("done");
    expect(updateData(0).stats).toBeUndefined();
  });

  it("skips the stats fill when the blob fails validation", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    // Claims schemaVersion 1 but drops a field the schema requires.
    const incomplete: Record<string, unknown> = { ...tilerStats };
    delete incomplete.editorsCount;
    vi.mocked(readPulledStats).mockResolvedValue(incomplete);

    const results = await pollPendingTileJobs();

    expect(results.completed).toBe(1);
    expect(updateData(0).tilesState).toBe("done");
    expect(updateData(0).stats).toBeUndefined();
  });

  it("skips the stats fill on a malformed bbox", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      bbox: [1, 2],
    });

    const results = await pollPendingTileJobs();

    // The dataset page requires a 4-element bbox, so a short one must never
    // reach the column.
    expect(results.completed).toBe(1);
    expect(updateData(0).tilesState).toBe("done");
    expect(updateData(0).bbox).toBeUndefined();
    expect(updateData(0).stats).toBeUndefined();
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
