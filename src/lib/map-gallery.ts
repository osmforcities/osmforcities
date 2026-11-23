import type { Bbox } from "@/types/geojson";

export type GalleryCase = {
  label: string;
  templateId: string;
  osmRelationId: number;
  areaName: string;
};

export const GALLERY_ZOOMS = [11, 12, 14, 16] as const;

export const GALLERY_CASES: GalleryCase[] = [
  { label: "Dense polygons", templateId: "buildings", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Sparse small polygons", templateId: "swimming-pools", osmRelationId: 419203, areaName: "Utrecht" },
  { label: "Dense polygons, small town", templateId: "buildings", osmRelationId: 47762, areaName: "Zandvoort" },
  { label: "Mixed points and polygons", templateId: "schools", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Dense points", templateId: "bus-stops", osmRelationId: 298285, areaName: "Sao Paulo" },
  { label: "Sparse points, visible at z11-z12?", templateId: "hospitals", osmRelationId: 185554, areaName: "Altamira" },
  { label: "Dense lines", templateId: "cycleways", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Small polygons over the cap, empty at z11-z12?", templateId: "swimming-pools", osmRelationId: 111257, areaName: "Phoenix" },
];

export function galleryCenter(
  area: { centerLat?: number | null; centerLon?: number | null },
  bbox: Bbox | null
): [number, number] | null {
  if (area.centerLat != null && area.centerLon != null) {
    return [area.centerLon, area.centerLat];
  }
  if (!bbox) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}
