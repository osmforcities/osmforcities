import { prisma } from "@/lib/db";
import {
  LARGE_JOB_MAXSIZE_BYTES,
  LARGE_JOB_TIMEOUT_SECONDS,
  submitTilesColumns,
  tilerEnabled,
  type TilesColumns,
} from "./client";
import {
  MAX_DATASET_BYTES,
  OVERPASS_BYTES_PER_ELEMENT_ESTIMATE,
} from "@/lib/constants";
import { TILES_ENABLED } from "@/lib/dataset-tiles";
import { isRetryDue } from "@/lib/dataset-retry";
import { UNCATALOGED_FILTER } from "@/lib/dataset-catalog-filter";

/**
 * The tiles-only lane: the tiler is the data source. Creation stores only the
 * count probe and every refresh submits a bake; the reconcile writes the
 * data. Both flags, since a row without geojson is only viewable when the map
 * renders tiles.
 */
export function tilesOnlyLaneEnabled(): boolean {
  return tilerEnabled() && TILES_ENABLED;
}

/**
 * Submit a bake for a dataset and record the outcome on the row
 * (tilesJobId/tilesState/tilesError). Called on creation and on every
 * refresh; the cron tick reconciles it.
 *
 * Never throws: a failed submit lands in tilesState/tilesError and the
 * caller decides what it costs.
 *
 * Returns the columns it persisted so a caller holding a pre-submit dataset
 * object can merge them in — a freshly created dataset must render its first
 * paint with tilesState "pending" (Sync disabled for admins, the processing
 * panel for rows with no map yet), not the stale null it was created with,
 * which needs a reload to clear.
 *
 * elementCount is a fresh count probe's answer. A refresh on the tiles-only
 * lane passes it rather than storing it, so the row keeps the served bake's
 * count.
 */
export async function submitTilesForDataset(
  datasetId: string,
  elementCount?: number
): Promise<TilesColumns> {
  if (!tilerEnabled()) return {};
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        areaId: true,
        dataCount: true,
        tilesServedJobId: true,
        template: { select: { overpassQuery: true, filterableTags: true } },
      },
    });
    if (!dataset) return {};
    // Without a fresh count probe the stored count stands in
    const count = elementCount ?? dataset.dataCount;

    // Nothing to bake: the tiler refuses a query that matches nothing. The
    // row is a plain empty dataset, and one stuck failing on that refusal
    // clears here. lastChecked too, since no reconcile will write it. A row
    // with no map stores the zero (the lane's refresh does not), or it would
    // try to render a map it never had.
    // ponytail: a served row whose features all vanish keeps its last archive
    // and count, clear tilesServedJobId and stats here if that shows up.
    if (count === 0) {
      const columns = { tilesJobId: null, tilesState: null, tilesError: null };
      await prisma.dataset.update({
        where: { id: datasetId },
        data: {
          ...columns,
          ...(!dataset.tilesServedJobId && { dataCount: 0 }),
          lastChecked: new Date(),
          consecutiveFailures: 0,
          lastError: null,
        },
      });
      return columns;
    }

    // Same area interpolation fetchDatasetSnapshot applies — the tiler runs
    // the exact query the app just ran.
    const query = dataset.template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      dataset.areaId.toString()
    );
    // Over-cap bakes need budgets the default per-query settings refuse. The
    // count probe's element count is the signal, the same number creation
    // caps on.
    const isOverCap =
      count * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE > MAX_DATASET_BYTES;
    const columns = await submitTilesColumns(
      datasetId,
      query,
      dataset.template.filterableTags,
      isOverCap
        ? {
            maxsize: LARGE_JOB_MAXSIZE_BYTES,
            timeout: LARGE_JOB_TIMEOUT_SECONDS,
          }
        : undefined
    );
    // Creation has no cron claim, so a started bake records the attempt and
    // its outcome waits out the retry ladder. A refused submit counts no
    // failure, so it stays unattempted and the next tick retries it.
    if (Object.keys(columns).length > 0) {
      await prisma.dataset.update({
        where: { id: datasetId },
        data: {
          ...columns,
          ...(columns.tilesState === "pending" && { lastAttempted: new Date() }),
        },
      });
    }
    return columns;
  } catch (error) {
    console.error(`Tiles submit for dataset ${datasetId} failed:`, error);
    return {};
  }
}

/**
 * A failed submit is a failed attempt: it climbs the ladder from now. Never
 * throws, the failed screen renders either way.
 */
export async function recordFailedSubmit(
  datasetId: string,
  tilesError: string | null | undefined
): Promise<void> {
  try {
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        lastAttempted: new Date(),
        consecutiveFailures: { increment: 1 },
        lastError: tilesError ?? "tiler submit failed",
      },
    });
  } catch (error) {
    console.error(`Recording failed submit for dataset ${datasetId} failed:`, error);
  }
}

/**
 * Resubmit a failed bake when its page is opened: the cron refreshes only
 * cataloged rows, so an unsaved dataset whose first bake failed is otherwise
 * never retried. Cataloged rows stay the cron's, so a tick never races this.
 *
 * The claim only lands if lastAttempted still holds the value read, so of two
 * visits only one submits.
 */
export async function retryFailedBake(row: {
  id: string;
  tilesState: string | null;
  lastAttempted: Date | null;
  consecutiveFailures: number;
  tilesError: string | null;
}): Promise<TilesColumns> {
  if (row.tilesState !== "failed" || !isRetryDue(row, new Date())) return {};
  // Any error leaves the failed screen as it was
  try {
    const { count } = await prisma.dataset.updateMany({
      where: {
        id: row.id,
        tilesState: "failed",
        lastAttempted: row.lastAttempted,
        ...UNCATALOGED_FILTER,
      },
      data: { lastAttempted: new Date() },
    });
    if (count === 0) return {};

    const columns = await submitTilesForDataset(row.id);
    if (columns.tilesState === "failed") {
      await recordFailedSubmit(row.id, columns.tilesError);
    }
    return columns;
  } catch (error) {
    console.error(`Bake retry for dataset ${row.id} failed:`, error);
    return {};
  }
}
