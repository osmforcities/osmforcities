import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  LARGE_JOB_MAXSIZE_BYTES,
  LARGE_JOB_TIMEOUT_SECONDS,
  submitTilesColumns,
} from "@/lib/tiler/client";
import { submitTilesForDataset } from "@/lib/tiler/submit";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
      },
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
