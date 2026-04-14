import { prisma } from "@/lib/db";
import simplify from "@turf/simplify";
import { executeOverpassQuery, convertOverpassToGeoJSON } from "@/lib/osm";
import { BOUNDARY_SIMPLIFICATION_TOLERANCE } from "@/lib/constants";
import type { FeatureCollection } from "geojson";

/**
 * Check if a GeoJSON feature collection contains a real polygon boundary.
 * Bounding box rectangles have exactly 5 points; real boundaries have many more.
 */
function isRealPolygon(fc: FeatureCollection): boolean {
  const geom = fc.features?.[0]?.geometry;
  if (!geom) return false;
  if (geom.type === "MultiPolygon") return true;
  if (geom.type === "Polygon") {
    return geom.coordinates[0].length > 5;
  }
  return false;
}

/**
 * Fetch area boundary for visualization.
 * Checks DB cache first, then fetches from Overpass if needed.
 * Simplifies geometry to reduce file size while preserving detail.
 *
 * @param areaId - OSM relation ID
 * @returns Simplified boundary GeoJSON, or null if not found
 */
export async function getAreaBoundary(areaId: number): Promise<FeatureCollection | null> {
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { geojson: true },
  });

  if (area?.geojson) {
    const cached = area.geojson as unknown as FeatureCollection;
    if (isRealPolygon(cached)) {
      return simplify(cached, { tolerance: BOUNDARY_SIMPLIFICATION_TOLERANCE, highQuality: false });
    }
  }

  const queryString = `[out:json][timeout:60];rel(${areaId});out geom;`;
  const overpassData = await executeOverpassQuery(queryString);
  const geojson = convertOverpassToGeoJSON(overpassData);

  const relationFeature = geojson.features.find(
    (f) => f.id === `relation/${areaId}`
  );

  if (!relationFeature) {
    return null;
  }

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: [relationFeature],
  };

  await prisma.area.update({
    where: { id: areaId },
    data: { geojson: JSON.parse(JSON.stringify(featureCollection)) },
  });

  return simplify(featureCollection, { tolerance: BOUNDARY_SIMPLIFICATION_TOLERANCE, highQuality: false });
}
