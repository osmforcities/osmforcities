import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  LARGE_JOB_MAXSIZE_BYTES,
  LARGE_JOB_TIMEOUT_SECONDS,
  submitTilesColumns,
} from "@/lib/tiler/client";
import { retryFailedBake, submitTilesForDataset } from "@/lib/tiler/submit";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Keep tilerEnabled real (env-driven); stub only the HTTP submit.
vi.mock("@/lib/tiler/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiler/client")>()),
  submitTilesColumns: vi.fn(),
}));

const row = {
  areaId: 47798,
  dataCount: 100,
  template: {
    overpassQuery: "[out:json];rel({OSM_RELATION_ID});out geom meta;",
    filterableTags: ["surface"],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row as never);
  vi.mocked(prisma.dataset.update).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("submitTilesForDataset", () => {
  it("does nothing when the tiler is disabled", async () => {
    vi.stubEnv("TILER_URL", "");
    await submitTilesForDataset("ds-1");
    expect(prisma.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("submits the area-interpolated template query and records the columns", async () => {
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesJobId: "ds-1-100",
      tilesState: "pending",
      tilesError: null,
    });

    await submitTilesForDataset("ds-1");

    expect(submitTilesColumns).toHaveBeenCalledWith(
      "ds-1",
      "[out:json];rel(47798);out geom meta;",
      ["surface"],
      undefined // under-cap: default tiler budgets
    );
    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: {
        tilesJobId: "ds-1-100",
        tilesState: "pending",
        tilesError: null,
        lastAttempted: expect.any(Date),
      },
    });
  });

  it("leaves a refused submit unattempted, so the next tick retries it", async () => {
    // Stamped with no failure counted, the row would sit on the daily wait
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesState: "failed",
      tilesError: "Tiler submit failed: 500",
    });

    await submitTilesForDataset("ds-1");

    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { tilesState: "failed", tilesError: "Tiler submit failed: 500" },
    });
  });

  it("passes raised budgets for an over-cap (tiles-only) dataset", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      ...row,
      dataCount: 10_000_000,
    } as never);
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesJobId: "ds-1-100",
      tilesState: "pending",
      tilesError: null,
    });

    await submitTilesForDataset("ds-1");

    expect(submitTilesColumns).toHaveBeenCalledWith(
      "ds-1",
      "[out:json];rel(47798);out geom meta;",
      ["surface"],
      { maxsize: LARGE_JOB_MAXSIZE_BYTES, timeout: LARGE_JOB_TIMEOUT_SECONDS }
    );
  });

  it("sizes budgets from a fresh count probe over the stored count", async () => {
    // Stored count from an under-cap bake; the area has since grown past the cap
    vi.mocked(submitTilesColumns).mockResolvedValue({});

    await submitTilesForDataset("ds-1", 10_000_000);

    expect(submitTilesColumns).toHaveBeenCalledWith(
      "ds-1",
      "[out:json];rel(47798);out geom meta;",
      ["surface"],
      { maxsize: LARGE_JOB_MAXSIZE_BYTES, timeout: LARGE_JOB_TIMEOUT_SECONDS }
    );
  });

  it("never submits an empty dataset and clears a stuck failed bake", async () => {
    await submitTilesForDataset("ds-1", 0);

    expect(submitTilesColumns).not.toHaveBeenCalled();
    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: {
        tilesJobId: null,
        tilesState: null,
        tilesError: null,
        lastChecked: expect.any(Date),
        consecutiveFailures: 0,
        lastError: null,
      },
    });
  });

  it("reads an empty dataset from the stored count without a fresh probe", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      ...row,
      dataCount: 0,
    } as never);

    const columns = await submitTilesForDataset("ds-1");

    expect(submitTilesColumns).not.toHaveBeenCalled();
    expect(columns).toEqual({
      tilesJobId: null,
      tilesState: null,
      tilesError: null,
    });
  });

  it("submits a dataset that gained features since it was stored empty", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
      ...row,
      dataCount: 0,
    } as never);
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesJobId: "ds-1-100",
      tilesState: "pending",
      tilesError: null,
    });

    await submitTilesForDataset("ds-1", 3);

    expect(submitTilesColumns).toHaveBeenCalled();
  });

  it("writes nothing for an unknown dataset or an empty column set", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null as never);
    await submitTilesForDataset("gone");

    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(row as never);
    vi.mocked(submitTilesColumns).mockResolvedValue({});
    await submitTilesForDataset("ds-1");

    expect(prisma.dataset.update).not.toHaveBeenCalled();
  });

  it("never throws — a DB error is logged, not propagated", async () => {
    vi.mocked(prisma.dataset.findUnique).mockRejectedValue(new Error("db down"));
    await expect(submitTilesForDataset("ds-1")).resolves.toEqual({});
  });

  it("returns the persisted columns so creation can render pending first paint", async () => {
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesJobId: "ds-1-100",
      tilesState: "pending",
      tilesError: null,
    });

    await expect(submitTilesForDataset("ds-1")).resolves.toEqual({
      tilesJobId: "ds-1-100",
      tilesState: "pending",
      tilesError: null,
    });
  });
});

describe("retryFailedBake", () => {
  const failed = {
    id: "ds-1",
    tilesState: "failed",
    lastAttempted: null,
    consecutiveFailures: 1,
    tilesError: "Tiler submit failed: 500",
  };

  beforeEach(() => {
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 1 });
  });

  it("leaves a bake that has not failed alone", async () => {
    await expect(
      retryFailedBake({ ...failed, tilesState: "pending" })
    ).resolves.toEqual({});
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing inside the retry wait", async () => {
    await expect(
      retryFailedBake({ ...failed, lastAttempted: new Date() })
    ).resolves.toEqual({});
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
    expect(submitTilesColumns).not.toHaveBeenCalled();
  });

  it("claims lastAttempted against the value it read, then submits", async () => {
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesJobId: "ds-1-200",
      tilesState: "pending",
      tilesError: null,
    });

    await expect(retryFailedBake(failed)).resolves.toMatchObject({
      tilesState: "pending",
    });
    expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
      where: {
        id: "ds-1",
        tilesState: "failed",
        lastAttempted: null,
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: expect.any(Date) },
    });
    expect(submitTilesColumns).toHaveBeenCalledTimes(1);
  });

  it("does not submit when another visit claimed first, or the row is cataloged", async () => {
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 0 });
    await expect(retryFailedBake(failed)).resolves.toEqual({});
    expect(submitTilesColumns).not.toHaveBeenCalled();
  });

  it("counts a failed submit like the cron does", async () => {
    vi.mocked(submitTilesColumns).mockResolvedValue({
      tilesState: "failed",
      tilesError: "Tiler submit failed: 503",
    });

    await retryFailedBake(failed);
    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: {
        lastAttempted: expect.any(Date),
        consecutiveFailures: { increment: 1 },
        lastError: "Tiler submit failed: 503",
      },
    });
  });

  it("never throws: a failed claim leaves the failed screen", async () => {
    vi.mocked(prisma.dataset.updateMany).mockRejectedValue(new Error("db down"));
    await expect(retryFailedBake(failed)).resolves.toEqual({});
  });
});
