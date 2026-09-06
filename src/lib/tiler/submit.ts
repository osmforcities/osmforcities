import { prisma } from "@/lib/db";
import {
  LARGE_JOB_MAXSIZE_BYTES,
  LARGE_JOB_TIMEOUT_SECONDS,
  submitTilesColumns,
  tilerEnabled,
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
 */
export async function submitTilesForDataset(datasetId: string): Promise<void> {
  if (!tilerEnabled()) return;
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        areaId: true,
        dataCount: true,
        template: { select: { overpassQuery: true, filterableTags: true } },
      },
    });
    if (!dataset) return;

    // Same area interpolation fetchDatasetSnapshot applies — the tiler runs
    // the exact query the app just ran (or, for the tiles-only lane, the one
    // the app only count-probed).
    const query = dataset.template.overpassQuery.replace(
      /\{OSM_RELATION_ID\}/g,
      dataset.areaId.toString()
    );
    // Over-cap datasets (tiles-only lane) need Overpass budgets the default
    // per-query settings would refuse; derived from the stored count so no
    // extra flag has to travel with the snapshot.
    const isLarge =
      dataset.dataCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE >
      MAX_DATASET_BYTES;
    const columns = await submitTilesColumns(
      datasetId,
      query,
      dataset.template.filterableTags,
      isLarge
        ? {
            maxsize: LARGE_JOB_MAXSIZE_BYTES,
            timeout: LARGE_JOB_TIMEOUT_SECONDS,
          }
        : undefined
    );
    if (Object.keys(columns).length > 0) {
      await prisma.dataset.update({ where: { id: datasetId }, data: columns });
    }
  } catch (error) {
    console.error(`Tiles submit for dataset ${datasetId} failed:`, error);
  }
}
