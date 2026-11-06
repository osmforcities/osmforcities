import { after } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchDatasetSnapshot,
  snapshotDatasetColumns,
} from "@/lib/dataset-snapshot";
import { recordFailedSubmit, submitTilesForDataset } from "@/lib/tiler/submit";
import { isCountProbeDue, type CountProbeRow } from "@/lib/dataset-retry";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dataset-count-probe");

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
    const failedAt = new Date();
    logger.error("Count probe failed", { datasetId, error });
    await prisma.dataset
      .updateMany({
        where: stillClaimed,
        data: {
          consecutiveFailures: { increment: 1 },
          lastError: error instanceof Error ? error.message : String(error),
          lastAttempted: failedAt,
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

// A probe over a large area outlives the hosting's request timeouts
export function startCountProbe(datasetId: string, claimedAt: Date): void {
  after(() => runCountProbe(datasetId, claimedAt));
}

/** @returns whether a probe runs for this row afterwards */
export async function resumeCountProbeIfDue(
  row: CountProbeRow
): Promise<boolean> {
  const noProbeFailed = row.consecutiveFailures === 0;
  if (!isCountProbeDue(row, new Date())) return noProbeFailed;
  try {
    const claimedAt = new Date();
    const { count } = await prisma.dataset.updateMany({
      where: {
        id: row.id,
        tilesState: "counting",
        lastAttempted: row.lastAttempted,
        // Cataloged rows are the cron's
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: claimedAt },
    });
    if (count === 0) return noProbeFailed;
    startCountProbe(row.id, claimedAt);
    return true;
  } catch (error) {
    logger.error("Count probe resume failed", { datasetId: row.id, error });
    return noProbeFailed;
  }
}
