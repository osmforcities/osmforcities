import type { Prisma } from "@prisma/client";
import { datasetTilesPath, tilesPointCount } from "@/lib/dataset-tiles";
import { readStats } from "@/lib/dataset-stats";
import type { FilterDimension } from "@/lib/filter-dimensions";
import { BboxSchema, type Bbox } from "@/types/geojson";

/** A featured row whose first bake is pending or failed has nothing to draw. */
export function featuredHeroWhere(): Prisma.DatasetWhereInput {
  return {
    isFeatured: true,
    dataCount: { gt: 0 },
    tilesServedJobId: { not: null },
  };
}

export type HeroTiles = {
  url: string;
  pointCount: number;
  bbox: Bbox | null;
  filterDimensions: FilterDimension[];
};

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
