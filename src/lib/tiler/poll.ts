import { prisma } from "@/lib/db";
import {
  ackTileJob,
  downloadTileOutputs,
  getTileJob,
  pruneTileArchives,
  tilerEnabled,
  type TileJob,
} from "./client";

export type TilePollResults = {
  checked: number;
  completed: number;
  failed: number;
  stillPending: number;
};

export type ReconcileOutcome = "completed" | "failed" | "pending";

// Jobs whose outputs are being pulled right now. A pull takes seconds to
// minutes while the row still reads "pending", and the tiles-status route is
// polled every 4s (per open tab) alongside the cron tick — without this every
// poll would start another download of the same archive.
// ponytail: in-process guard; a DB claim (tilesState transition) if the app
// ever runs more than one Node process. Unique temp names in downloadToFile
// already make cross-process races safe, just wasteful.
const inflightPulls = new Set<string>();

/**
 * Apply one tiler job's current state to its dataset row: pull + ack + prune
 * on done, record failures, leave running jobs pending. Callers fetch the job
 * themselves (the cron loop and the tiles-status endpoint share this; the
 * endpoint also wants the raw job for progress display). Idempotent and safe
 * to race with the cron poll: downloads are temp+rename, ack tolerates 404,
 * and the done-update writes the same values.
 */
export async function reconcileDataset(
  dataset: { id: string; tilesJobId: string },
  job: TileJob | null
): Promise<ReconcileOutcome> {
  if (job === null) {
    // Swept by the tiler before we pulled (PMTILER_MAX_AGE_DAYS). The next
    // daily snapshot resubmits naturally.
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { tilesState: "failed", tilesError: "job expired before pull" },
    });
    return "failed";
  }
  if (job.state === "done") {
    if (inflightPulls.has(dataset.tilesJobId)) return "pending";
    inflightPulls.add(dataset.tilesJobId);
    try {
      await downloadTileOutputs(dataset.tilesJobId);
      await prisma.dataset.update({
        where: { id: dataset.id },
        data: {
          tilesState: "done",
          tilesUpdatedAt: new Date(),
          tilesError: null,
        },
      });
    } finally {
      inflightPulls.delete(dataset.tilesJobId);
    }
    // Best-effort housekeeping: a failed ack just leaves the job for the
    // tiler's own sweep. Prune never rejects (it logs internally).
    await ackTileJob(dataset.tilesJobId).catch((error) => {
      console.error(`Tile job ack failed for ${dataset.tilesJobId}:`, error);
    });
    await pruneTileArchives(dataset.id);
    return "completed";
  }
  if (job.state === "failed") {
    // errorKind "too_large" is a permanent refusal for this query —
    // prefixed so nothing downstream blind-retries it.
    const message =
      (job.errorKind ? `${job.errorKind}: ` : "") +
      (job.error ?? "tiler job failed");
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { tilesState: "failed", tilesError: message },
    });
    return "failed";
  }
  return "pending";
}

/**
 * Reconcile every dataset with a pending tile job against the tiler — runs on
 * the existing cron tick, no scheduler of its own. Transient errors (tiler
 * unreachable, download hiccup) leave the row pending for the next tick.
 * Never throws.
 */
export async function pollPendingTileJobs(): Promise<TilePollResults> {
  const results: TilePollResults = {
    checked: 0,
    completed: 0,
    failed: 0,
    stillPending: 0,
  };
  if (!tilerEnabled()) return results;

  let pending: { id: string; tilesJobId: string | null }[];
  try {
    pending = await prisma.dataset.findMany({
      where: { tilesState: "pending", tilesJobId: { not: null } },
      select: { id: true, tilesJobId: true },
    });
  } catch (error) {
    // A DB blip here must not fail the surrounding cron tick.
    console.error("Tile poll: failed to list pending datasets:", error);
    return results;
  }

  for (const dataset of pending) {
    results.checked++;
    const jobId = dataset.tilesJobId as string;
    try {
      const job = await getTileJob(jobId);
      const outcome = await reconcileDataset(
        { id: dataset.id, tilesJobId: jobId },
        job
      );
      if (outcome === "completed") results.completed++;
      else if (outcome === "failed") results.failed++;
      else results.stillPending++;
    } catch (error) {
      console.error(`Tile job poll failed for dataset ${dataset.id}:`, error);
      results.stillPending++;
    }
  }

  return results;
}
