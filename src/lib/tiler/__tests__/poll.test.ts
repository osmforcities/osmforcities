import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getTileJob,
  downloadTileOutputs,
  fetchTileNdjson,
  ackTileJob,
  pruneTileArchives,
} from "@/lib/tiler/client";
import { readPulledStats } from "@/lib/tiler/stats";
import { pollPendingTileJobs, reconcileDataset } from "@/lib/tiler/poll";
import { notifyDatasetReady } from "@/lib/tasks/notify-ready";

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
  fetchTileNdjson: vi.fn(),
  ackTileJob: vi.fn(),
  pruneTileArchives: vi.fn(),
}));

// TILES_ENABLED is a module-load constant; a getter lets each test flip it.
const flags = vi.hoisted(() => ({ tilesEnabled: false }));
vi.mock("@/lib/dataset-tiles", () => ({
  get TILES_ENABLED() {
    return flags.tilesEnabled;
  },
}));

// Keep the mapper real; only the file read is stubbed.
vi.mock("@/lib/tiler/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/stats")>()),
  readPulledStats: vi.fn(),
}));

vi.mock("@/lib/tasks/notify-ready", () => ({
  notifyDatasetReady: vi.fn(),
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
  flags.tilesEnabled = false;
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
  vi.mocked(prisma.dataset.findMany).mockResolvedValue([pendingRow] as never);
  vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 1 } as never);
  // Non-null stored stats: the done branch skips the tiler stats fill.
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
    stats: {},
    dataCount: 7,
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
      errors: [],
    });
    expect(downloadTileOutputs).toHaveBeenCalledWith("ds-1-100");
    // A finished bake is the success that resets the retry ladder.
    expect(updateData(0)).toMatchObject({
      tilesState: "done",
      tilesError: null,
      consecutiveFailures: 0,
    });
    expect(updateData(0).tilesUpdatedAt).toBeInstanceOf(Date);
    // The served pointer moves only on a winning done
    expect(updateData(0).tilesServedJobId).toBe("ds-1-100");
    // A dataset the app fetched keeps its own stats — the tiler's are ignored,
    // even app stats older than filterDimensions.
    expect(readPulledStats).not.toHaveBeenCalled();
    expect(updateData(0).stats).toBeUndefined();
    expect(ackTileJob).toHaveBeenCalledWith("ds-1-100");
    expect(pruneTileArchives).toHaveBeenCalledWith("ds-1");
    expect(notifyDatasetReady).toHaveBeenCalledTimes(1);
    expect(notifyDatasetReady).toHaveBeenCalledWith("ds-1", 7);
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
    // Tiles-only: the count the bake just wrote, not the stale row.
    expect(notifyDatasetReady).toHaveBeenCalledWith("ds-1", 42);
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

  it("maps the tiler's ageBands onto the legend's age dimension", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      filterDimensions: [
        { key: "roof:shape", kind: "tag", values: [], missing: 42 },
      ],
      ageBands: [1, 0, 3, 38],
    });

    await pollPendingTileJobs();

    const stats = updateData(0).stats as { filterDimensions: unknown[] };
    // Same ids and order as computeAgeDimension; empty buckets dropped.
    expect(stats.filterDimensions).toEqual([
      { key: "roof:shape", kind: "tag", values: [], missing: 42 },
      {
        key: "age",
        kind: "age",
        values: [
          { value: "recent", count: 1 },
          { value: "older", count: 3 },
          { value: "very-old", count: 38 },
        ],
        missing: 0,
      },
    ]);
    expect(stats).not.toHaveProperty("ageBands");
  });

  it("adds no age dimension when the bake carries no ageBands", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue(tilerStats);

    await pollPendingTileJobs();

    const stats = updateData(0).stats as { filterDimensions: unknown[] };
    expect(stats.filterDimensions).toEqual([]);
  });

  it("skips the stats fill on ageBands of the wrong length", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: null,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      ageBands: [1, 2],
    });

    await pollPendingTileJobs();

    expect(updateData(0).tilesState).toBe("done");
    expect(updateData(0).stats).toBeUndefined();
  });

  it("refills tiles-only stats that predate the age dimension", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: {
        filterDimensions: [
          { key: "roof:shape", kind: "tag", values: [], missing: 7 },
        ],
      },
      dataCount: 7,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      ageBands: [0, 0, 0, 42],
    });

    await pollPendingTileJobs();

    expect(updateData(0).dataCount).toBe(42);
    const stats = updateData(0).stats as { filterDimensions: unknown[] };
    expect(stats.filterDimensions).toContainEqual({
      key: "age",
      kind: "age",
      values: [{ value: "very-old", count: 42 }],
      missing: 0,
    });
  });

  it("leaves app-fetched stats with an age dimension alone", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "done" });
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: {
        filterDimensions: [{ key: "age", kind: "age", values: [], missing: 0 }],
      },
      dataCount: 7,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue(tilerStats);

    await pollPendingTileJobs();

    expect(readPulledStats).not.toHaveBeenCalled();
    expect(updateData(0).stats).toBeUndefined();
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
    expect(notifyDatasetReady).not.toHaveBeenCalled();
    expect(results.errors).toEqual([
      {
        datasetId: "ds-1",
        kind: "too_large",
        error: "too_large: runtime error: out of memory",
      },
    ]);
    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "too_large: runtime error: out of memory",
      consecutiveFailures: { increment: 1 },
    });
    expect(downloadTileOutputs).not.toHaveBeenCalled();
  });

  it("a failed rebuild leaves the served archive pointer alone", async () => {
    vi.mocked(getTileJob).mockResolvedValue({ id: "ds-1-100", state: "failed" });

    await pollPendingTileJobs();

    expect(updateData(0)).not.toHaveProperty("tilesServedJobId");
  });

  it("marks a swept (404) job failed so the next snapshot resubmits", async () => {
    vi.mocked(getTileJob).mockResolvedValue(null);

    const results = await pollPendingTileJobs();

    expect(results.failed).toBe(1);
    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "job expired before pull",
      consecutiveFailures: { increment: 1 },
    });
    expect(results.errors).toEqual([
      { datasetId: "ds-1", kind: "bake", error: "job expired before pull" },
    ]);
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
      errors: [{ datasetId: "ds-1", kind: "reconcile", error: "ECONNREFUSED" }],
    });
    // Transient: the counter is not charged.
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
      errors: [],
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
    // The loser of the done-race must not ack, prune or mail — the winner does.
    expect(ackTileJob).not.toHaveBeenCalled();
    expect(pruneTileArchives).not.toHaveBeenCalled();
    expect(notifyDatasetReady).not.toHaveBeenCalled();
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

describe("reconcile with the tiles lane on", () => {
  const done = { id: "ds-1-100", state: "done" as const };
  const ndjson = [
    JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [1, 2] },
      properties: {
        "@id": "node/1",
        "@user": "alice",
        "@timestamp": "2026-01-01T00:00:00Z",
        _ts: 1767225600,
        amenity: "bench",
      },
    }),
    JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [3, 4] },
      properties: { "@id": "node/2", _ts: 0 },
    }),
    "",
  ].join("\n");

  beforeEach(() => {
    flags.tilesEnabled = true;
    // App-fetched stats with an age dimension: the flag-off gate would skip it
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      stats: {
        filterDimensions: [{ key: "age", kind: "age", values: [], missing: 0 }],
      },
      dataCount: 7,
    } as never);
    vi.mocked(readPulledStats).mockResolvedValue(tilerStats);
    vi.mocked(fetchTileNdjson).mockResolvedValue(ndjson);
  });

  it("overwrites the stats on every bake", async () => {
    expect(await reconcileDataset(pendingRow, done)).toEqual({
      outcome: "completed",
    });

    const data = updateData(0);
    expect(data.tilesState).toBe("done");
    expect(data.dataCount).toBe(42);
    expect(data.contributorsCount).toBe(3);
    expect(data.lastEditedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(data.stats).toMatchObject({ editorsCount: 3 });
    expect(data.lastChecked).toBeInstanceOf(Date);
    expect(data.consecutiveFailures).toBe(0);
    expect(data.lastError).toBeNull();
    expect(notifyDatasetReady).toHaveBeenCalledWith("ds-1", 42);
  });

  it("keeps the previous columns when the stats are unusable", async () => {
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      schemaVersion: 2,
    });

    expect(await reconcileDataset(pendingRow, done)).toEqual({
      outcome: "completed",
    });

    const data = updateData(0);
    expect(data.tilesState).toBe("done");
    expect(data.tilesServedJobId).toBe("ds-1-100");
    expect(data).not.toHaveProperty("stats");
    expect(data).not.toHaveProperty("dataCount");
    expect(data).not.toHaveProperty("geojson");
    // Not a completed refresh
    expect(data).not.toHaveProperty("lastChecked");
    expect(notifyDatasetReady).toHaveBeenCalledWith("ds-1", 7);
  });

  it("keeps the previous columns when the stats cannot be read", async () => {
    vi.mocked(readPulledStats).mockRejectedValue(new Error("ENOENT"));

    await reconcileDataset(pendingRow, done);

    expect(updateData(0).tilesState).toBe("done");
    expect(updateData(0)).not.toHaveProperty("stats");
    expect(updateData(0)).not.toHaveProperty("lastChecked");
  });

  it("backfills geojson from the bake's ndjson under the cap", async () => {
    await reconcileDataset(pendingRow, done);

    expect(fetchTileNdjson).toHaveBeenCalledWith("ds-1-100");
    // Same flat shape the app's own fetch stores: unprefixed meta, no _ts
    expect(updateData(0).geojson).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "node/1",
          geometry: { type: "Point", coordinates: [1, 2] },
          properties: {
            id: "node/1",
            user: "alice",
            timestamp: "2026-01-01T00:00:00Z",
            amenity: "bench",
          },
        },
        {
          type: "Feature",
          id: "node/2",
          geometry: { type: "Point", coordinates: [3, 4] },
          properties: { id: "node/2" },
        },
      ],
    });
  });

  it("stores JsonNull over the cap without pulling the ndjson", async () => {
    vi.mocked(readPulledStats).mockResolvedValue({
      ...tilerStats,
      features: 200_000,
    });

    await reconcileDataset(pendingRow, done);

    expect(fetchTileNdjson).not.toHaveBeenCalled();
    expect(updateData(0).geojson).toBe(Prisma.JsonNull);
    expect(updateData(0).dataCount).toBe(200_000);
  });

  it("stores JsonNull when the ndjson is larger than the cap", async () => {
    vi.mocked(fetchTileNdjson).mockResolvedValue("x".repeat(26 * 1024 * 1024));

    await reconcileDataset(pendingRow, done);

    expect(updateData(0).geojson).toBe(Prisma.JsonNull);
  });

  it("a failed backfill keeps the stored geojson and still writes the stats", async () => {
    vi.mocked(fetchTileNdjson).mockRejectedValue(new Error("404"));

    expect(await reconcileDataset(pendingRow, done)).toEqual({
      outcome: "completed",
    });

    expect(updateData(0)).not.toHaveProperty("geojson");
    expect(updateData(0).dataCount).toBe(42);
  });

  it("a failed bake sets lastError next to the counter", async () => {
    await reconcileDataset(pendingRow, {
      id: "ds-1-100",
      state: "failed",
      error: "boom",
    });

    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "boom",
      consecutiveFailures: { increment: 1 },
      lastError: "boom",
    });
  });

  it("an expired job sets lastError next to the counter", async () => {
    await reconcileDataset(pendingRow, null);

    expect(updateData(0)).toEqual({
      tilesState: "failed",
      tilesError: "job expired before pull",
      consecutiveFailures: { increment: 1 },
      lastError: "job expired before pull",
    });
  });
});
