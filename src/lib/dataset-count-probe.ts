import { after } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchDatasetSnapshot,
  snapshotDatasetColumns,
} from "@/lib/dataset-snapshot";
import { recordFailedSubmit, submitTilesForDataset } from "@/lib/tiler/submit";
import { isCountProbeDue } from "@/lib/dataset-retry";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dataset-count-probe");

/**
 * Never throws: it runs after the response, with no one to catch it. Writes
 * land only while the row still holds this probe's claim, so a probe that
 * outlived its budget and was resumed elsewhere leaves the row to the newer
 * one.
 */
export async function runCountProbe(
  datasetId: string,
  claimedAt: Date
): Promise<void> {
  const stillClaimed = {
    id: datasetId,
    tilesState: "counting",
    lastAttempted: claimedAt,
  };
  try {
    const row = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        areaId: true,
        templateId: true,
        template: { select: { overpassQuery: true } },
      },
    });
    if (!row) return;
    const snapshot = await fetchDatasetSnapshot(
      row.areaId,
      row.template.overpassQuery,
      row.templateId
    );
    const { count } = await prisma.dataset.updateMany({
      where: stillClaimed,
      data: snapshotDatasetColumns(snapshot),
    });
    if (count === 0) return;
    const { tilesState, tilesError } = await submitTilesForDataset(datasetId);
    if (tilesState === "failed") await recordFailedSubmit(datasetId, tilesError);
  } catch (error) {
    logger.error("Count probe failed", { datasetId, error });
    await prisma.dataset
      .updateMany({
        where: stillClaimed,
        data: {
          consecutiveFailures: { increment: 1 },
          lastError: error instanceof Error ? error.message : String(error),
        },
      })
      .catch((recordError) =>
        logger.error("Recording count probe failure failed", {
          datasetId,
          recordError,
        })
      );
  }
}

export function startCountProbe(datasetId: string, claimedAt: Date): void {
  after(() => runCountProbe(datasetId, claimedAt));
}

export type CountProbeRow = {
  id: string;
  tilesState: string | null;
  lastAttempted: Date | null;
  consecutiveFailures: number;
};

/** Restarts a lost or failed probe first, when one is due. */
export async function countProbeRunning(row: CountProbeRow): Promise<boolean> {
  return (await resumeCountProbe(row)) || row.consecutiveFailures === 0;
}

/**
 * Cataloged rows are the cron's, so the two never race. The claim lands only
 * if lastAttempted is unchanged, so of two visits only one probes.
 */
async function resumeCountProbe(row: CountProbeRow): Promise<boolean> {
  if (!isCountProbeDue(row, new Date())) return false;
  try {
    const claimedAt = new Date();
    const { count } = await prisma.dataset.updateMany({
      where: {
        id: row.id,
        tilesState: "counting",
        lastAttempted: row.lastAttempted,
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: claimedAt },
    });
    if (count === 0) return false;
    startCountProbe(row.id, claimedAt);
    return true;
  } catch (error) {
    logger.error("Count probe resume failed", { datasetId: row.id, error });
    return false;
  }
}
