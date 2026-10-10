import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/dataset-snapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataset-snapshot")>()),
  fetchDatasetSnapshot: vi.fn(),
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

// Tiler integration is additive and covered by its own tests — stub it here so
// this suite's prisma call-order assertions stay about the refresh queue.
vi.mock("@/lib/tiler/submit", () => ({
  submitTilesForDataset: vi.fn().mockResolvedValue({}),
  tilesOnlyLaneEnabled: vi.fn(),
}));

vi.mock("@/lib/tiler/poll", () => ({
  pollPendingTileJobs: vi.fn(),
}));
import { pollPendingTileJobs } from "@/lib/tiler/poll";

vi.mock("@/lib/tiler/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/client")>()),
  tilerEnabled: vi.fn(),
  pingTiler: vi.fn(),
}));
import { pingTiler, tilerEnabled } from "@/lib/tiler/client";
import { submitTilesForDataset, tilesOnlyLaneEnabled } from "@/lib/tiler/submit";

import { Prisma } from "@prisma/client";
import { POST } from "../route";
import { DatasetSizeCheckTimeoutError } from "@/lib/dataset-snapshot";
import {
  CATALOG_FILTER,
  UNCATALOGED_FILTER,
} from "@/lib/dataset-catalog-filter";

const dataset = {
  id: "ds-1",
  areaId: 1,
  templateId: "tmpl-1",
  template: { overpassQuery: "[out:json]; rel(1); out;" },
  area: {},
};

const snapshot = {
  geojson: { type: "FeatureCollection", features: [] },
  bbox: [0, 0, 1, 1],
  stats: {
    mostRecentElement: null,
    editorsCount: 3,
    recentActivity: { elementsEdited: 2 },
  },
  dataCount: 10,
};

const call = () =>
  POST(
    new NextRequest("http://localhost/api/tasks/update-datasets", {
      method: "POST",
      headers: { authorization: "Bearer secret" },
    })
  );

// Every prisma.dataset.update call whose data matches the given predicate.
const updateCallsMatching = (predicate: (data: Record<string, unknown>) => boolean) =>
  vi.mocked(prisma.dataset.update).mock.calls.filter((c) =>
    predicate((c[0] as { data: Record<string, unknown> }).data)
  );

describe("POST /api/tasks/update-datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_ROUTE_SECRET = "secret";
    process.env.DATASET_UPDATE_LIMIT = "1";
    vi.mocked(prisma.dataset.findMany).mockResolvedValue([dataset] as never);
    vi.mocked(prisma.dataset.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.dataset.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(pollPendingTileJobs).mockResolvedValue({
      checked: 0,
      completed: 0,
      failed: 0,
      stillPending: 0,
      errors: [],
    });
    vi.mocked(tilerEnabled).mockReturnValue(false);
    vi.mocked(tilesOnlyLaneEnabled).mockReturnValue(false);
    vi.mocked(pingTiler).mockResolvedValue(true);
  });

  it("claims the slot upfront (advances lastAttempted) even when the refresh fails", async () => {
    vi.mocked(fetchDatasetSnapshot).mockRejectedValueOnce(new Error("boom"));

    const res = await call();
    const body = await res.json();
    expect(body.data.failed).toBe(1);

    // Anti-jam guarantee: lastAttempted is advanced before any work, so a failing
    // dataset yields its queue slot instead of being re-picked forever.
    expect(
      updateCallsMatching((d) => d.lastAttempted instanceof Date && !("lastError" in d))
    ).toHaveLength(1);

    // Failure is recorded for admin review.
    expect(
      updateCallsMatching(
        (d) =>
          d.lastError === "boom" &&
          JSON.stringify(d.consecutiveFailures) === JSON.stringify({ increment: 1 })
      )
    ).toHaveLength(1);
  });

  it("resets failure tracking on a successful refresh", async () => {
    vi.mocked(fetchDatasetSnapshot).mockResolvedValueOnce(snapshot as never);

    const res = await call();
    const body = await res.json();
    expect(body.data.successful).toBe(1);
    expect(body.data.failed).toBe(0);

    expect(
      updateCallsMatching(
        (d) =>
          d.consecutiveFailures === 0 &&
          d.lastError === null &&
          d.lastChecked instanceof Date
      )
    ).toHaveLength(1);
  });

  it("selects rows by the retry ladder, not a flat daily cutoff", async () => {
    await call();

    const refreshWhere = vi.mocked(prisma.dataset.findMany).mock.calls[0][0]
      ?.where as { OR: Record<string, unknown>[] };
    expect(refreshWhere.OR).toContainEqual(
      expect.objectContaining({ consecutiveFailures: 1 })
    );
    expect(refreshWhere.OR).toContainEqual({ lastAttempted: null });
  });

  it("with the tiler on, leaves the counter for the bake to reset", async () => {
    vi.mocked(tilerEnabled).mockReturnValue(true);
    vi.mocked(fetchDatasetSnapshot).mockResolvedValueOnce(snapshot as never);

    const body = await (await call()).json();

    expect(body.data.successful).toBe(1);
    expect(updateCallsMatching((d) => "consecutiveFailures" in d)).toHaveLength(0);
  });

  it("charges a failed bake submit to the counter, logged as kind submit", async () => {
    vi.mocked(tilerEnabled).mockReturnValue(true);
    vi.mocked(fetchDatasetSnapshot).mockResolvedValueOnce(snapshot as never);
    vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
      tilesState: "failed",
      tilesError: "Tiler submit failed: 503",
    });

    const body = await (await call()).json();

    expect(body.data.failed).toBe(1);
    expect(body.data.errors).toEqual([
      { datasetId: "ds-1", kind: "submit", error: "Tiler submit failed: 503" },
    ]);
    expect(
      updateCallsMatching(
        (d) =>
          JSON.stringify(d.consecutiveFailures) === JSON.stringify({ increment: 1 })
      )
    ).toHaveLength(1);
  });

  it("skips the tick without touching any counter when the tiler is down", async () => {
    vi.mocked(tilerEnabled).mockReturnValue(true);
    vi.mocked(pingTiler).mockResolvedValue(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.tilerUnreachable).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    expect(fetchDatasetSnapshot).not.toHaveBeenCalled();
    expect(prisma.dataset.update).not.toHaveBeenCalled();
    // Reconcile of already-pending bakes still runs.
    expect(pollPendingTileJobs).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("still yields the slot when the size check times out", async () => {
    vi.mocked(fetchDatasetSnapshot).mockRejectedValueOnce(
      new DatasetSizeCheckTimeoutError()
    );

    const res = await call();
    const body = await res.json();
    expect(body.data.failed).toBe(1);

    expect(
      updateCallsMatching((d) => d.lastAttempted instanceof Date && !("lastError" in d))
    ).toHaveLength(1);
    expect(
      updateCallsMatching(
        (d) =>
          JSON.stringify(d.consecutiveFailures) === JSON.stringify({ increment: 1 })
      )
    ).toHaveLength(1);
  });

  it("skips only the affected dataset (not the whole batch) when the upfront claim write fails", async () => {
    const other = { ...dataset, id: "ds-2" };
    vi.mocked(prisma.dataset.findMany).mockResolvedValue([dataset, other] as never);
    // First claim (ds-1) throws; every later update (ds-2 claim + success) resolves.
    vi.mocked(prisma.dataset.update)
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValue({} as never);
    vi.mocked(fetchDatasetSnapshot).mockResolvedValue(snapshot as never);

    const res = await call();
    const body = await res.json();

    // The run still completes (no 500) and the second dataset is processed.
    expect(res.status).toBe(200);
    expect(body.data.successful).toBe(1);
    // The skipped dataset is counted, so the totals reconcile.
    expect(body.data.failed).toBe(1);
    expect(body.data.successful + body.data.failed).toBe(body.data.totalFound);
  });

  it("refreshes only cataloged datasets (catalog filter in the refresh query)", async () => {
    await call();

    const refreshWhere = vi.mocked(prisma.dataset.findMany).mock.calls[0][0]
      ?.where;
    expect(refreshWhere).toEqual(expect.objectContaining(CATALOG_FILTER));
  });

  it("deletes stale uncataloged datasets past the grace period", async () => {
    vi.mocked(prisma.dataset.findMany)
      .mockResolvedValueOnce([] as never) // refresh pass
      .mockResolvedValueOnce([{ id: "stale-1", cityName: "X" }] as never); // cleanup pass
    vi.mocked(prisma.dataset.deleteMany).mockResolvedValue({
      count: 1,
    } as never);

    const res = await call();
    const body = await res.json();

    const cleanupWhere = vi.mocked(prisma.dataset.findMany).mock.calls[1][0]
      ?.where as Record<string, unknown>;
    expect(cleanupWhere).toMatchObject({
      ...UNCATALOGED_FILTER,
      createdAt: { lt: expect.any(Date) },
    });
    // The delete re-checks the mutable predicates so a save landing between the
    // two queries wins.
    expect(prisma.dataset.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["stale-1"] },
        ...UNCATALOGED_FILTER,
      },
    });
    expect(body.data.cleanup.deleted).toBe(1);
  });

  it("skips the delete when nothing is stale", async () => {
    vi.mocked(prisma.dataset.findMany).mockResolvedValue([] as never);

    const res = await call();
    const body = await res.json();

    expect(prisma.dataset.deleteMany).not.toHaveBeenCalled();
    expect(body.data.cleanup.deleted).toBe(0);
  });

  it("reconciles pending tile jobs on the tick and reports the results", async () => {
    vi.mocked(prisma.dataset.findMany).mockResolvedValue([] as never);
    vi.mocked(pollPendingTileJobs).mockResolvedValue({
      checked: 3,
      completed: 2,
      failed: 1,
      stillPending: 0,
      errors: [],
    });

    const res = await call();
    const body = await res.json();

    expect(pollPendingTileJobs).toHaveBeenCalledOnce();
    expect(body.data.tiles).toEqual({
      checked: 3,
      completed: 2,
      failed: 1,
      stillPending: 0,
      errors: [],
    });
  });

  it("sweeps geojson from deactivated datasets", async () => {
    vi.mocked(prisma.dataset.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({
      count: 2,
    } as never);

    const res = await call();
    const body = await res.json();

    expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
      where: { isActive: false, geojson: { not: Prisma.AnyNull } },
      data: { geojson: Prisma.JsonNull },
    });
    expect(body.data.cleanup.geojsonCleared).toBe(2);
  });

  describe("on the tiles-only lane", () => {
    beforeEach(() => {
      vi.mocked(tilerEnabled).mockReturnValue(true);
      vi.mocked(tilesOnlyLaneEnabled).mockReturnValue(true);
      vi.mocked(submitTilesForDataset).mockResolvedValue({
        tilesJobId: "ds-1-100",
        tilesState: "pending",
        tilesError: null,
      });
      // The lane's snapshot is the count probe alone
      vi.mocked(fetchDatasetSnapshot).mockResolvedValue({
        tilesOnly: true,
        geojson: null,
        stats: null,
        bbox: null,
        dataCount: 60_000,
      });
    });

    it("submits a bake sized by the probe, writing nothing but the claim", async () => {
      const body = await (await call()).json();

      expect(body.data.successful).toBe(1);
      expect(submitTilesForDataset).toHaveBeenCalledWith("ds-1", 60_000);
      // The served data, dataCount included, stays until the reconcile
      // writes the bake's
      expect(prisma.dataset.update).toHaveBeenCalledOnce();
      expect(
        updateCallsMatching((d) => d.lastAttempted instanceof Date)
      ).toHaveLength(1);
    });

    it("charges a failed submit to the counter", async () => {
      vi.mocked(submitTilesForDataset).mockResolvedValueOnce({
        tilesState: "failed",
        tilesError: "Tiler submit failed: 503",
      });

      const body = await (await call()).json();

      expect(body.data.errors).toEqual([
        { datasetId: "ds-1", kind: "submit", error: "Tiler submit failed: 503" },
      ]);
    });
  });

  it("stores the snapshot as before when the tiler is on but the map does not render tiles", async () => {
    vi.mocked(tilerEnabled).mockReturnValue(true);
    vi.mocked(fetchDatasetSnapshot).mockResolvedValueOnce(snapshot as never);

    await call();

    expect(updateCallsMatching((d) => "geojson" in d)).toHaveLength(1);
    expect(submitTilesForDataset).toHaveBeenCalledOnce();
  });

  it("returns 401 without the cron secret", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/tasks/update-datasets", {
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
    expect(prisma.dataset.findMany).not.toHaveBeenCalled();
  });
});
