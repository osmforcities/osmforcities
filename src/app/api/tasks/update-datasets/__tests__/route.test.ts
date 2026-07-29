import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fetchDatasetSnapshot } from "@/lib/dataset-snapshot";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findMany: vi.fn(), update: vi.fn() } },
}));

vi.mock("@/lib/dataset-snapshot", () => {
  class DatasetTooLargeError extends Error {}
  class DatasetSizeCheckTimeoutError extends Error {}
  return {
    fetchDatasetSnapshot: vi.fn(),
    DatasetTooLargeError,
    DatasetSizeCheckTimeoutError,
  };
});

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { DatasetSizeCheckTimeoutError } from "@/lib/dataset-snapshot";

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
