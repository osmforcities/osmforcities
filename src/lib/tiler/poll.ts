import { prisma } from "@/lib/db";
import {
  ackTileJob,
  downloadTileOutputs,
  getTileJob,
  pruneTileArchives,
  tilerEnabled,
} from "./client";

export type TilePollResults = {
  checked: number;
  completed: number;
  failed: number;
  stillPending: number;
};

/**
 * Reconcile every dataset with a pending tile job against the tiler — runs on
 * the existing cron tick, no scheduler of its own. Done jobs are pulled to
 * TILES_DIR, acked, and pruned; failures land in tilesError; transient errors
 * (tiler unreachable, download hiccup) leave the row pending for the next
 * tick. Never throws.
 */
export async function pollPendingTileJobs(): Promise<TilePollResults> {
  const results: TilePollResults = {
    checked: 0,
    completed: 0,
    failed: 0,
    stillPending: 0,
  };
  if (!tilerEnabled()) return results;

  const pending = await prisma.dataset.findMany({
    where: { tilesState: "pending", tilesJobId: { not: null } },
    select: { id: true, tilesJobId: true },
  });

  for (const dataset of pending) {
    results.checked++;
    const jobId = dataset.tilesJobId as string;
    try {
      const job = await getTileJob(jobId);

      if (job === null) {
        // Swept by the tiler before we pulled (PMTILER_MAX_AGE_DAYS). The
        // next daily snapshot resubmits naturally.
        await prisma.dataset.update({
          where: { id: dataset.id },
          data: { tilesState: "failed", tilesError: "job expired before pull" },
        });
        results.failed++;
      } else if (job.state === "done") {
        await downloadTileOutputs(jobId);
        await prisma.dataset.update({
          where: { id: dataset.id },
          data: {
            tilesState: "done",
            tilesUpdatedAt: new Date(),
            tilesError: null,
          },
        });
        // Best-effort housekeeping: a failed ack just leaves the job for the
        // tiler's own sweep, and prune retries on the next completion.
        await ackTileJob(jobId).catch(() => {});
        await pruneTileArchives(dataset.id).catch(() => {});
        results.completed++;
      } else if (job.state === "failed") {
        // errorKind "too_large" is a permanent refusal for this query —
        // prefixed so nothing downstream blind-retries it.
        const message =
          (job.errorKind ? `${job.errorKind}: ` : "") +
          (job.error ?? "tiler job failed");
        await prisma.dataset.update({
          where: { id: dataset.id },
          data: { tilesState: "failed", tilesError: message },
        });
        results.failed++;
      } else {
        results.stillPending++;
      }
    } catch (error) {
      console.error(`Tile job poll failed for dataset ${dataset.id}:`, error);
      results.stillPending++;
    }
  }

  return results;
}
