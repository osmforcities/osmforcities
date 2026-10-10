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
 * paint with tilesState "pending" (Sync disabled for admins; the full
 * processing panel once the tiles-only lane lands), not the stale null it was
 * created with, which needs a reload to clear.
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
        template: { select: { overpassQuery: true, filterableTags: true } },
      },
    });
    if (!dataset) return {};

    // Same area interpolation fetchDatasetSnapshot applies — the tiler runs
    // the exact query the app just ran.
    const query = dataset.template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      dataset.areaId.toString()
    );
    // Over-cap bakes need budgets the default per-query settings refuse. The
    // count probe's element count is the signal, the same number creation
    // caps on. Without a fresh one the stored count stands in.
    const isOverCap =
      (elementCount ?? dataset.dataCount) *
        OVERPASS_BYTES_PER_ELEMENT_ESTIMATE >
      MAX_DATASET_BYTES;
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
    if (Object.keys(columns).length > 0) {
      await prisma.dataset.update({ where: { id: datasetId }, data: columns });
    }
    return columns;
  } catch (error) {
    console.error(`Tiles submit for dataset ${datasetId} failed:`, error);
    return {};
  }
}
