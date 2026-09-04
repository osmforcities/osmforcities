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
