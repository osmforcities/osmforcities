import type { Prisma } from "@prisma/client";
import {
  TILES_ENABLED,
  datasetTilesPath,
  tilesPointCount,
} from "@/lib/dataset-tiles";
import { readStats } from "@/lib/dataset-stats";
import type { FilterDimension } from "@/lib/filter-dimensions";
import { BboxSchema, type Bbox } from "@/types/geojson";

/**
 * With tiles on, a featured row whose first bake is pending or failed has
 * nothing to draw, so it never reaches the hero.
 */
export function featuredHeroWhere(): Prisma.DatasetWhereInput {
  return {
    isFeatured: true,
    dataCount: { gt: 0 },
    ...(TILES_ENABLED && { tilesServedJobId: { not: null } }),
  };
}

export type HeroTiles = {
  url: string;
  pointCount: number;
  bbox: Bbox | null;
  filterDimensions: FilterDimension[];
};

/** Null means the hero draws the stored geojson instead. */
export function heroTiles(dataset: {
  tilesServedJobId: string | null;
  dataCount: number;
  bbox: unknown;
  stats: unknown;
}): HeroTiles | null {
  const path = datasetTilesPath(dataset);
  if (!path) return null;
  const stats = readStats(dataset);
  return {
    url: `pmtiles://${path}`,
    pointCount: tilesPointCount({ dataCount: dataset.dataCount, stats }),
    bbox: BboxSchema.safeParse(dataset.bbox).data ?? null,
    filterDimensions: stats?.filterDimensions ?? [],
  };
}
