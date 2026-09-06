import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  ackTileJob,
  downloadTileNdjson,
  downloadTileOutputs,
  getTileJob,
  pruneTileArchives,
  tilerEnabled,
  type TileJob,
} from "./client";
import {
  readPulledFeatures,
  readPulledStats,
  tilerStatsToDatasetColumns,
} from "./stats";
import {
  MAX_DATASET_BYTES,
  OVERPASS_BYTES_PER_ELEMENT_ESTIMATE,
} from "@/lib/constants";

export type TilePollResults = {
  checked: number;
  completed: number;
  failed: number;
  stillPending: number;
};

export type ReconcileOutcome = "completed" | "failed" | "pending";

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
    // daily submit retries; the refresh did not complete, so it counts.
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        tilesState: "failed",
        tilesError: "job expired before pull",
        consecutiveFailures: { increment: 1 },
        lastError: "tile job expired before pull",
      },
    });
    return "failed";
  }
  if (job.state === "done") {
    // Phase 3: this write is THE refresh — the tiler is the data source.
    // A failed archive download throws to the caller (row stays pending,
    // next tick retries); only a stats READ problem degrades gracefully.
    await downloadTileOutputs(dataset.tilesJobId);
    let mapped: ReturnType<typeof tilerStatsToDatasetColumns> = null;
    try {
      mapped = tilerStatsToDatasetColumns(
        await readPulledStats(dataset.tilesJobId)
      );
    } catch (error) {
      console.error(
        `Stats read from tiler failed for dataset ${dataset.id}:`,
        error
      );
    }

    if (!mapped) {
      // Archive is served but the stats were unusable (unknown schema, read
      // error): keep the previous authoritative columns untouched — do not
      // claim a completed refresh (lastChecked stays put).
      await prisma.dataset.update({
        where: { id: dataset.id },
        data: {
          tilesState: "done",
          tilesUpdatedAt: new Date(),
          tilesError: null,
        },
      });
      await ackTileJob(dataset.tilesJobId).catch(() => {});
      await pruneTileArchives(dataset.id).catch(() => {});
      return "completed";
    }

    // GeoJSON backfill keeps export/?slim/fallback alive for datasets that
    // fit the storage cap; larger ones store JsonNull (the old over-cap
    // semantics — tiles are their only representation).
    let geojson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      Prisma.JsonNull;
    const underCap =
      mapped.dataCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE <=
      MAX_DATASET_BYTES;
    if (underCap) {
      try {
        await downloadTileNdjson(dataset.tilesJobId);
        const collection = await readPulledFeatures(dataset.tilesJobId);
        if (collection) {
          geojson = collection as unknown as Prisma.InputJsonValue;
        }
      } catch (error) {
        console.error(
          `GeoJSON backfill failed for dataset ${dataset.id}:`,
          error
        );
      }
    }

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        ...mapped,
        geojson,
        lastChecked: new Date(), // the pull IS the refresh (health keys on this)
        consecutiveFailures: 0,
        lastError: null,
        tilesState: "done",
        tilesUpdatedAt: new Date(),
        tilesError: null,
      },
    });
    // Best-effort housekeeping: a failed ack just leaves the job for the
    // tiler's own sweep, and prune retries on the next completion.
    await ackTileJob(dataset.tilesJobId).catch(() => {});
    await pruneTileArchives(dataset.id).catch(() => {});
    return "completed";
  }
  if (job.state === "failed") {
    // errorKind "too_large" is a permanent refusal for this query —
    // prefixed so nothing downstream blind-retries it.
    const message =
      (job.errorKind ? `${job.errorKind}: ` : "") +
      (job.error ?? "tiler job failed");
    // Phase 3: a tiler failure is THE refresh failure — feed the same
    // admin-review counters recordFailure used to. The previous archive and
    // stats keep serving; no deactivation (tiles cap far exceeds 25 MB).
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        tilesState: "failed",
        tilesError: message,
        consecutiveFailures: { increment: 1 },
        lastError: message,
      },
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

  const pending = await prisma.dataset.findMany({
    where: { tilesState: "pending", tilesJobId: { not: null } },
    select: { id: true, tilesJobId: true },
  });

  for (const dataset of pending) {
    results.checked++;
    const jobId = dataset.tilesJobId as string;
    try {
      const job = await getTileJob(jobId);
      const outcome = await reconcileDataset({ id: dataset.id, tilesJobId: jobId }, job);
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
