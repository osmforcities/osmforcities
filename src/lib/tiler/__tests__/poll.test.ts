import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTileJob,
  downloadTileOutputs,
  ackTileJob,
  pruneTileArchives,
} from "@/lib/tiler/client";
import { readPulledStats } from "@/lib/tiler/stats";
import { pollPendingTileJobs } from "@/lib/tiler/poll";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

// Keep the mapper real; only the file read is stubbed.
vi.mock("@/lib/tiler/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/stats")>()),
  readPulledStats: vi.fn(),
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
  // Non-null stored stats: the done-branch skips the tiler stats fill
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
    stats: {},
  } as never);
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

  it("fills stats from the tiler's stats.json for tiles-only datasets", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      schemaVersion: 1,
      features: 42,
      editorsCount: 3,
      changesetsCount: 4,
      elementVersionsCount: 9,
      oldestElement: "2020-01-01T00:00:00Z",
      mostRecentElement: "2026-01-01T00:00:00Z",
      averageElementAge: 100,
      averageElementVersion: 2,
      recentActivity: { elementsEdited: 5, changesets: 2, editors: 2 },
      qualityMetrics: {},
      editRecencyBands: [1, 1, 1, 39],
      mapperRecencyBands: [1, 0, 0, 2],
      tagCounts: [{ key: "building", count: 42 }],
      filterDimensions: [],
      geometryMix: { points: 0, lines: 0, areas: 42, lineKm: 0, areaKm2: 1 },
      bbox: [1, 2, 3, 4],
    });

    const results = await pollPendingTileJobs();

    expect(results.completed).toBe(1);
    const data = updateData(0);
    expect(data.tilesState).toBe("done");
    expect(data.dataCount).toBe(42);
    expect(data.contributorsCount).toBe(3);
    expect(data.recentlyEditedCount).toBe(5);
    expect(data.bbox).toEqual([1, 2, 3, 4]);
    expect(data.lastEditedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(
      (data.stats as { tagCounts: unknown[] }).tagCounts
    ).toEqual([{ key: "building", count: 42 }]);
  });

  it("skips the stats fill on an unknown schemaVersion", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({ schemaVersion: 2 });

    const results = await pollPendingTileJobs();

    expect(results.completed).toBe(1);
    const data = updateData(0);
    expect(data.tilesState).toBe("done");
    expect(data.stats).toBeUndefined();
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

  it("a failed download leaves the row pending for the next tick", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(downloadTileOutputs).mockRejectedValue(new Error("disk full"));

    const results = await pollPendingTileJobs();

    expect(results.stillPending).toBe(1);
    expect(prisma.dataset.update).not.toHaveBeenCalled();
    expect(ackTileJob).not.toHaveBeenCalled();
  });
});
