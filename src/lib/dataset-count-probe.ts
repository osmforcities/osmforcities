import { after } from "next/server";
import { prisma } from "@/lib/db";
import {
  probeElementCount,
  type ElementCount,
} from "@/lib/overpass/count-probe";
import { recordFailedSubmit, submitTilesForDataset } from "@/lib/tiler/submit";
import { isCountProbeDue, type CountProbeRow } from "@/lib/dataset-retry";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dataset-count-probe");

export function countProbeColumns(elementCount: ElementCount) {
  return {
    ...(elementCount !== "unknown" && { dataCount: elementCount }),
    // A null lastChecked drops the row out of the health freshness checks while its first bake runs
    lastChecked: new Date(),
  };
}

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
    const elementCount = await probeElementCount(
      row.areaId,
      row.template.overpassQuery,
      row.templateId
    );
    const { count } = await prisma.dataset.updateMany({
      where: stillClaimed,
      data: countProbeColumns(elementCount),
    });
    if (count === 0) return;
    const { tilesState, tilesError } = await submitTilesForDataset(
      datasetId,
      elementCount
    );
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

/** @returns whether the wait page should keep polling this row */
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
        // Cataloged rows are the cron's, so it never reads this counter
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: claimedAt, consecutiveFailures: 0 },
    });
    if (count === 0) return probeRunningOrPast(row.id);
    startCountProbe(row.id, claimedAt);
    return true;
  } catch (error) {
    logger.error("Count probe resume failed", { datasetId: row.id, error });
    return noProbeFailed;
  }
}

async function probeRunningOrPast(datasetId: string): Promise<boolean> {
  const fresh = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { tilesState: true, consecutiveFailures: true },
  });
  return (
    !!fresh &&
    (fresh.tilesState !== "counting" || fresh.consecutiveFailures === 0)
  );
}
