import { describe, it, expect, vi, beforeEach } from "vitest";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import {
  DatasetSizeCheckTimeoutError,
  fetchDatasetSnapshot,
} from "@/lib/dataset-snapshot";
import { recordFailedSubmit, submitTilesForDataset } from "@/lib/tiler/submit";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";
import { resumeCountProbeIfDue, runCountProbe } from "@/lib/dataset-count-probe";

vi.mock("next/server", () => ({ after: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/dataset-snapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataset-snapshot")>()),
  fetchDatasetSnapshot: vi.fn(),
}));

vi.mock("@/lib/tiler/submit", () => ({
  submitTilesForDataset: vi.fn(),
  recordFailedSubmit: vi.fn(),
}));

const MINUTE_MS = 60 * 1000;
const claimedAt = new Date("2026-11-05T12:00:00Z");
const stillClaimed = { id: "ds-1", tilesState: "counting", lastAttempted: claimedAt };
const countedSnapshot = (dataCount: number) => ({
  tilesOnly: true as const,
  geojson: null,
  stats: null,
  bbox: null,
  dataCount,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.dataset.findUnique).mockResolvedValue({
    areaId: 298285,
    templateId: "buildings",
    template: { overpassQuery: "[out:json];" },
  } as never);
  vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 1 });
});

describe("runCountProbe", () => {
  it("stores the count, then submits the first bake", async () => {
    vi.mocked(fetchDatasetSnapshot).mockResolvedValue(countedSnapshot(1_200_000));
    vi.mocked(submitTilesForDataset).mockResolvedValue({
      tilesJobId: "ds-1-1",
      tilesState: "pending",
      tilesError: null,
    });

    await runCountProbe("ds-1", claimedAt);

    expect(fetchDatasetSnapshot).toHaveBeenCalledWith(298285, "[out:json];", "buildings");
    expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
      where: stillClaimed,
      data: { dataCount: 1_200_000, lastChecked: expect.any(Date) },
    });
    expect(submitTilesForDataset).toHaveBeenCalledWith("ds-1");
    expect(recordFailedSubmit).not.toHaveBeenCalled();
  });

  it("submits nothing once a newer probe holds the claim", async () => {
    vi.mocked(fetchDatasetSnapshot).mockResolvedValue(countedSnapshot(10));
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 0 });

    await runCountProbe("ds-1", claimedAt);

    expect(submitTilesForDataset).not.toHaveBeenCalled();
  });

  it("starts the retry wait on a failed submit", async () => {
    vi.mocked(fetchDatasetSnapshot).mockResolvedValue(countedSnapshot(10));
    vi.mocked(submitTilesForDataset).mockResolvedValue({
      tilesState: "failed",
      tilesError: "Tiler submit failed: 500",
    });

    await runCountProbe("ds-1", claimedAt);

    expect(recordFailedSubmit).toHaveBeenCalledWith("ds-1", "Tiler submit failed: 500");
  });

  it("records a timed-out probe on the row, restarting its retry wait at the failure", async () => {
    vi.mocked(fetchDatasetSnapshot).mockRejectedValue(
      new DatasetSizeCheckTimeoutError()
    );

    await expect(runCountProbe("ds-1", claimedAt)).resolves.toBeUndefined();

    expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
      where: stillClaimed,
      data: {
        consecutiveFailures: { increment: 1 },
        lastError: new DatasetSizeCheckTimeoutError().message,
        lastAttempted: expect.any(Date),
      },
    });
    const { lastAttempted } = vi.mocked(prisma.dataset.updateMany).mock.calls[0][0]
      .data as { lastAttempted: Date };
    expect(lastAttempted.getTime()).toBeGreaterThan(claimedAt.getTime());
    expect(submitTilesForDataset).not.toHaveBeenCalled();
  });
});

describe("resumeCountProbeIfDue", () => {
  const counting = (agoMs: number, consecutiveFailures = 0) => ({
    id: "ds-1",
    tilesState: "counting",
    lastAttempted: new Date(Date.now() - agoMs),
    consecutiveFailures,
  });

  it("leaves a probe inside its budget running", async () => {
    expect(await resumeCountProbeIfDue(counting(5 * MINUTE_MS))).toBe(true);
    expect(prisma.dataset.updateMany).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("claims and restarts a probe lost past its budget", async () => {
    const lost = counting(11 * MINUTE_MS);

    expect(await resumeCountProbeIfDue(lost)).toBe(true);

    expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
      where: {
        id: "ds-1",
        tilesState: "counting",
        lastAttempted: lost.lastAttempted,
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: expect.any(Date) },
    });
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("reports a failed probe as stopped until its wait is over", async () => {
    expect(await resumeCountProbeIfDue(counting(20 * MINUTE_MS, 1))).toBe(false);
    expect(after).not.toHaveBeenCalled();
  });

  it("restarts a failed probe once its wait is over", async () => {
    expect(await resumeCountProbeIfDue(counting(31 * MINUTE_MS, 1))).toBe(true);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("starts nothing when another visit claimed it first", async () => {
    vi.mocked(prisma.dataset.updateMany).mockResolvedValue({ count: 0 });

    expect(await resumeCountProbeIfDue(counting(31 * MINUTE_MS, 1))).toBe(false);
    expect(after).not.toHaveBeenCalled();
  });
});
