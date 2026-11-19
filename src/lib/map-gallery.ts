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
  { label: "Dense points with sparse small polygons", templateId: "swimming-pools", osmRelationId: 111257, areaName: "Phoenix" },
  { label: "Very dense points", templateId: "trees", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Large sparse polygons", templateId: "parks", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Sparse lines", templateId: "busways", osmRelationId: 271110, areaName: "Amsterdam" },
  { label: "Buildings scattered over a huge area", templateId: "buildings", osmRelationId: 185554, areaName: "Altamira" },
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

export type ReviewMark = { ok: boolean; note: string; zoom: number; view: string; stale?: boolean };
export type ReviewMarks = Record<string, ReviewMark>;

export function isDue(mark: ReviewMark | undefined) {
  return !mark || mark.stale === true;
}

export function nextDueStopIndex(stopLabels: string[], currentIndex: number, marks: ReviewMarks) {
  for (let step = 1; step <= stopLabels.length; step++) {
    const index = (currentIndex + step) % stopLabels.length;
    if (index !== currentIndex && isDue(marks[stopLabels[index]])) return index;
  }
  return -1;
}

export function reviewTally(stopLabels: string[], marks: ReviewMarks) {
  const given = stopLabels.map((label) => marks[label]).filter((mark) => !isDue(mark));
  const ok = given.filter((mark) => mark?.ok).length;
  return { ok, notOk: given.length - ok, left: stopLabels.length - given.length };
}

export function markLine(stopLabel: string, mark: ReviewMark | undefined) {
  if (!mark || isDue(mark)) return `- unmarked: ${stopLabel}`;
  const view = mark.view && `, ${mark.view}`;
  const note = mark.note && `: ${mark.note}`;
  return `- ${mark.ok ? "ok" : "NOT OK"}: ${stopLabel} (seen at z${mark.zoom}${view})${note}`;
}
