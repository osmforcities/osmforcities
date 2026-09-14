import { prisma } from "@/lib/db";
import { submitTilesColumns, tilerEnabled, type TilesColumns } from "./client";

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
    const columns = await submitTilesColumns(
      datasetId,
      query,
      dataset.template.filterableTags
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
