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

/**
 * Submit a bake job for a dataset's fresh snapshot and record the outcome on
 * the row (tilesJobId/tilesState/tilesError). Called after every successful
 * snapshot persist; the cron tick polls the job to completion.
 *
 * Never throws — the tiles pipeline is additive and must not fail the
 * snapshot path that just succeeded.
 *
 * Returns the columns it persisted so a caller holding a pre-submit dataset
 * object can merge them in — a freshly created dataset must render its first
 * paint with tilesState "pending" (today the processing notice; the full
 * processing panel once the tiles-only lane lands), not the stale null it was
 * created with, which needs a reload to clear.
 */
export async function submitTilesForDataset(
  datasetId: string
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
    // Over-cap datasets reach the tiler without an app-side fetch (the
    // tiles-only lane), and those jobs need budgets the default per-query
    // settings refuse. The stored count is the signal, so no extra flag has to
    // travel with the snapshot: for a tiles-only row it is the count probe's
    // element count, the same number the creation pre-flight caps on. A row the
    // app did fetch stores a smaller feature count instead, which can only err
    // toward the default budgets.
    const isOverCap =
      dataset.dataCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE >
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
