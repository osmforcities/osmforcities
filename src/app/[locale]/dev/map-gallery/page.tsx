import { notFound } from "next/navigation";
import { getDatasetWithDetails } from "@/lib/dataset-operations";
import { transformDataset } from "@/lib/dataset/transform";
import { datasetTilesPath, tilesPointCount } from "@/lib/dataset-tiles";
import { GALLERY_CASES, galleryCenter } from "@/lib/map-gallery";
import { BboxSchema } from "@/types/geojson";
import { MapGallery, type GalleryRow } from "./map-gallery";

export const dynamic = "force-dynamic";

export default async function MapGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;

  const rows: GalleryRow[] = await Promise.all(
    GALLERY_CASES.map(async (galleryCase) => {
      const raw = await getDatasetWithDetails(
        galleryCase.osmRelationId,
        galleryCase.templateId,
        locale
      );
      if (!raw) return { galleryCase, dataset: null };

      const dataset = transformDataset(raw, null, locale, {
        skipTemplateResolution: true,
      });
      const bbox = BboxSchema.safeParse(dataset.bbox);
      const tilesPath = datasetTilesPath(dataset);
      return {
        galleryCase,
        dataset: {
          detail: dataset,
          center: galleryCenter(dataset.area, bbox.success ? bbox.data : null),
          tilesPath,
          pointCount: tilesPointCount(dataset),
        },
      };
    })
  );

  return <MapGallery rows={rows} />;
}
