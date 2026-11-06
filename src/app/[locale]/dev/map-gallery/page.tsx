import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { datasetTilesPath, tilesPointCount } from "@/lib/dataset-tiles";
import {
  GALLERY_CASES,
  galleryCenter,
  galleryRenderModes,
} from "@/lib/map-gallery";
import { BboxSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";
import { MapGallery, type GalleryRow } from "./map-gallery";

export const dynamic = "force-dynamic";

export default async function MapGalleryPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const rows: GalleryRow[] = await Promise.all(
    GALLERY_CASES.map(async (galleryCase) => {
      const dataset = await prisma.dataset.findUnique({
        where: {
          templateId_areaId: {
            templateId: galleryCase.templateId,
            areaId: galleryCase.osmRelationId,
          },
        },
        select: {
          geojson: true,
          bbox: true,
          dataCount: true,
          stats: true,
          tilesServedJobId: true,
          area: { select: { centerLat: true, centerLon: true } },
        },
      });
      if (!dataset) return { galleryCase, dataset: null };

      const bbox = BboxSchema.safeParse(dataset.bbox);
      const tilesPath = datasetTilesPath(dataset);
      return {
        galleryCase,
        dataset: {
          renderModes: galleryRenderModes({ geojson: dataset.geojson, tilesPath }),
          center: galleryCenter(dataset.area, bbox.success ? bbox.data : null),
          geojson: dataset.geojson,
          tilesPath,
          pointCount: tilesPointCount({
            dataCount: dataset.dataCount,
            stats: dataset.stats as Dataset["stats"],
          }),
        },
      };
    })
  );

  return <MapGallery rows={rows} />;
}
