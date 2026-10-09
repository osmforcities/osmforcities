import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ackTileJob,
  downloadTileOutputs,
  fetchTileNdjson,
  getTileJob,
  pruneTileArchives,
  tilerEnabled,
  type TileJob,
} from "./client";
import {
  ndjsonToFeatureCollection,
  readPulledStats,
  tilerStatsToDatasetColumns,
} from "./stats";
import { isTooLarge } from "@/lib/dataset-retry";
import { notifyDatasetReady } from "@/lib/tasks/notify-ready";
import { TILES_ENABLED } from "@/lib/dataset-tiles";
import {
  MAX_DATASET_BYTES,
  OVERPASS_BYTES_PER_ELEMENT_ESTIMATE,
} from "@/lib/constants";

export type TileFailureKind = "bake" | "too_large" | "reconcile";

export type TilePollResults = {
  checked: number;
  completed: number;
  failed: number;
  stillPending: number;
  errors: { datasetId: string; kind: TileFailureKind; error: string }[];
};

export type ReconcileOutcome = "completed" | "failed" | "pending";
export type ReconcileResult = { outcome: ReconcileOutcome; error?: string };

// Jobs whose outputs are being pulled right now. A pull takes seconds to
// minutes while the row still reads "pending", and the tiles-status route is
// polled every 4s (per open tab) alongside the cron tick — without this every
// poll would start another download of the same archive.
// ponytail: in-process guard; a DB claim (tilesState transition) if the app
// ever runs more than one Node process. Unique temp names in downloadToFile
// already make cross-process races safe, just wasteful.
const inflightPulls = new Set<string>();

// A reconcile may only commit against the (job, "pending") state it observed.
// A stale caller — row read moments ago, but the job since completed and got
// acked by a concurrent reconcile, so its lookup 404s — must not clobber the
// committed outcome; and a reconcile of an old job must never touch the fresh
// row of a resubmitted one (hence tilesJobId in the guard, not just state).
async function commitOutcome(
  dataset: { id: string; tilesJobId: string },
  data: Prisma.DatasetUpdateManyMutationInput & {
    tilesState: string;
    tilesError: string | null;
  }
): Promise<boolean> {
  const { count } = await prisma.dataset.updateMany({
    where: {
      id: dataset.id,
      tilesJobId: dataset.tilesJobId,
      tilesState: "pending",
    },
    data,
  });
  return count > 0;
}

// With the tiles flag on, every finished bake is the dataset's refresh: its
// stats replace the stored ones. Off, the tiler only fills empty stats.
function reconcileOwnsData(): boolean {
  return tilerEnabled() && TILES_ENABLED;
}

// A failed bake is a failed refresh, counted like the cron counts one
async function failBake(
  dataset: { id: string; tilesJobId: string },
  error: string
): Promise<ReconcileResult> {
  const won = await commitOutcome(dataset, {
    tilesState: "failed",
    tilesError: error,
    consecutiveFailures: { increment: 1 },
    ...(reconcileOwnsData() && { lastError: error }),
  });
  return won ? { outcome: "failed", error } : { outcome: "pending" };
}

/**
 * Flag-off fill gate: never-filled rows, plus tiles-only rows filled before
 * bakes carried age counts. App snapshots always store an age dimension, and
 * older ones store no filterDimensions at all, so neither matches.
 */
function needsTilerStatsFill(stats: Prisma.JsonValue): boolean {
  if (stats === null) return true;
  const dimensions = (stats as { filterDimensions?: { kind: string }[] })
    .filterDimensions;
  return Array.isArray(dimensions) && !dimensions.some((d) => d.kind === "age");
}

/**
 * The bake's features as stored geojson, so export and the geojson fallback
 * keep working once creation stops fetching it. Over the storage cap the
 * column is JsonNull, as the app stores over-cap rows. A failed pull returns
 * nothing to write: the stored geojson stays until the next bake.
 */
async function featureFill(
  jobId: string,
  features: number
): Promise<Pick<Prisma.DatasetUpdateManyMutationInput, "geojson">> {
  if (features * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE > MAX_DATASET_BYTES) {
    return { geojson: Prisma.JsonNull };
  }
  try {
    // The estimate is per element; the bytes are the real cap
    const ndjson = await fetchTileNdjson(jobId, MAX_DATASET_BYTES);
    if (ndjson === null) return { geojson: Prisma.JsonNull };
    return {
      // Parsed JSON, so already JSON-safe (no Dates to serialize)
      geojson: ndjsonToFeatureCollection(
        ndjson
      ) as unknown as Prisma.InputJsonValue,
    };
  } catch (error) {
    console.error(`Feature fill failed for bake ${jobId}:`, error);
    return {};
  }
}

/**
 * Apply one tiler job's current state to its dataset row: pull + ack + prune
 * on done, record failures, leave running jobs pending. Callers fetch the job
 * themselves (the cron loop and the tiles-status endpoint share this; the
 * endpoint also wants the raw job for progress display). Safe to race with
 * the cron poll: downloads are temp+rename with unique temp names, ack
 * tolerates 404, and every write is conditional on the row still holding the
 * observed pending job — a caller that lost the race reports "pending" and
 * the next poll reads the winner's result.
 */
export async function reconcileDataset(
  dataset: { id: string; tilesJobId: string },
  job: TileJob | null
): Promise<ReconcileResult> {
  if (job === null) {
    // Swept by the tiler before we pulled (PMTILER_MAX_AGE_DAYS) — or already
    // pulled and acked by a concurrent reconcile, which the conditional write
    // detects. A genuinely swept job resubmits on the next daily snapshot.
    return failBake(dataset, "job expired before pull");
  }
  if (job.state === "done") {
    if (inflightPulls.has(dataset.tilesJobId)) return { outcome: "pending" };
    inflightPulls.add(dataset.tilesJobId);
    let won: boolean;
    let dataCount: number;
    try {
      await downloadTileOutputs(dataset.tilesJobId);

      // Unusable stats (read error, unknown schema) leave every data column
      // as it was: the archive still lands, but the refresh did not happen.
      let statsColumns: Prisma.DatasetUpdateManyMutationInput = {};
      const row = await prisma.dataset.findUnique({
        where: { id: dataset.id },
        select: { stats: true, dataCount: true },
      });
      dataCount = row?.dataCount ?? 0;
      const authoritative = reconcileOwnsData();
      if (row && (authoritative || needsTilerStatsFill(row.stats))) {
        try {
          const mapped = tilerStatsToDatasetColumns(
            await readPulledStats(dataset.tilesJobId)
          );
          if (mapped) {
            statsColumns = authoritative
              ? {
                  ...mapped,
                  ...(await featureFill(
                    dataset.tilesJobId,
                    mapped.dataCount
                  )),
                  lastChecked: new Date(),
                  lastError: null,
                }
              : mapped;
            dataCount = mapped.dataCount;
          }
        } catch (error) {
          // Losing the stats must not also lose the archive.
          console.error(
            `Stats fill from tiler failed for dataset ${dataset.id}:`,
            error
          );
        }
      }

      won = await commitOutcome(dataset, {
        ...statsColumns,
        tilesState: "done",
        // Blue/green swap: the previous archive served through the whole bake
        tilesServedJobId: dataset.tilesJobId,
        tilesUpdatedAt: new Date(),
        tilesError: null,
        // A finished bake, not the snapshot before it, resets the retry ladder.
        consecutiveFailures: 0,
      });
    } finally {
      inflightPulls.delete(dataset.tilesJobId);
    }
    if (!won) return { outcome: "pending" }; // the winner acks, prunes and mails
    // Best-effort housekeeping: a failed ack just leaves the job for the
    // tiler's own sweep. Prune never rejects (it logs internally).
    await ackTileJob(dataset.tilesJobId).catch((error) => {
      console.error(`Tile job ack failed for ${dataset.tilesJobId}:`, error);
    });
    await pruneTileArchives(dataset.id);
    await notifyDatasetReady(dataset.id, dataCount);
    return { outcome: "completed" };
  }
  if (job.state === "failed") {
    // errorKind "too_large" is a permanent refusal for this query —
    // prefixed so nothing downstream blind-retries it.
    return failBake(
      dataset,
      (job.errorKind ? `${job.errorKind}: ` : "") +
        (job.error ?? "tiler job failed")
    );
  }
  return { outcome: "pending" };
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
    errors: [],
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
      const { outcome, error } = await reconcileDataset(
        { id: dataset.id, tilesJobId: jobId },
        job
      );
      if (outcome === "completed") results.completed++;
      else if (outcome === "failed") {
        results.failed++;
        results.errors.push({
          datasetId: dataset.id,
          kind: isTooLarge(error ?? null) ? "too_large" : "bake",
          error: error ?? "bake failed",
        });
      } else results.stillPending++;
    } catch (error) {
      // Lookup or archive download hiccup: transient, so the counter is not
      // charged.
      console.error(`Tile job poll failed for dataset ${dataset.id}:`, error);
      results.stillPending++;
      results.errors.push({
        datasetId: dataset.id,
        kind: "reconcile",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
