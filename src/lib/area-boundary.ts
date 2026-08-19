import { prisma } from "@/lib/db";
import { unstable_cache, revalidateTag } from "next/cache";
import simplify from "@turf/simplify";
import {
  executeOverpassQuery,
  convertOverpassToGeoJSON,
} from "@/lib/overpass/transport";
import { OverpassResponseSchema } from "@/types/overpass";
import type { OSMNode, OSMRelation } from "@/types/osm";
import { BOUNDARY_SIMPLIFICATION_TOLERANCE } from "@/lib/constants";
import { extractOsmNames } from "@/lib/area-name";
import { createLogger } from "@/lib/logger";
import type { FeatureCollection } from "geojson";

const log = createLogger("area-boundary");

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

const AREA_BOUNDARY_TAG = "area-boundaries";

/**
 * Stored boundary, simplified. Null when nothing usable is stored yet.
 *
 * Only the read path is cached: the Overpass fallback below writes back to the
 * DB, and caching that too would pin a `null` and keep re-querying Overpass.
 *
 * TTL is deliberately short. A `null` gets cached like any other result, and the
 * bust after the fallback write cannot run from a Server Component render — the
 * dataset page is exactly that. So for a cold area the TTL, not the bust, is
 * what bounds how long every visitor keeps re-hitting Overpass.
 */
const getStoredBoundary = unstable_cache(
  async (areaId: number): Promise<FeatureCollection | null> => {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
      select: { geojson: true },
    });

    if (!area?.geojson) return null;

    const stored = area.geojson as unknown as FeatureCollection;
    if (!isRealPolygon(stored)) return null;

    return simplify(stored, { tolerance: BOUNDARY_SIMPLIFICATION_TOLERANCE, highQuality: false });
  },
  ["area-boundary-stored"],
  { revalidate: 300, tags: [AREA_BOUNDARY_TAG] }
);

/**
 * Fetch area boundary for visualization.
 * Checks DB cache first, then fetches from Overpass if needed.
 * Simplifies geometry to reduce file size while preserving detail.
 *
 * @param areaId - OSM relation ID
 * @returns Simplified boundary GeoJSON, or null if not found
 */
export async function getAreaBoundary(areaId: number): Promise<FeatureCollection | null> {
  const stored = await getStoredBoundary(areaId);
  if (stored) return stored;

  const queryString = `[out:json][timeout:60];rel(${areaId});out geom;`;
  let overpassData;
  try {
    overpassData = await executeOverpassQuery(queryString);
  } catch (error) {
    log.warn("Overpass query failed", { areaId, error });
    return null;
  }
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

  // getStoredBoundary has this cached as absent. Only lands from a Route Handler
  // (/api/areas/[id]/boundary); from a page render it always throws and the
  // short TTL above is what clears the stale null instead. Busts every area, not
  // just this one — unstable_cache tags are static per function.
  try {
    revalidateTag(AREA_BOUNDARY_TAG);
  } catch {}

  return simplify(featureCollection, { tolerance: BOUNDARY_SIMPLIFICATION_TOLERANCE, highQuality: false });
}

export async function fetchOsmRelationData(relationId: number) {
  const query = `
    [out:json][timeout:25];
    rel(${relationId})->.a;
    .a out bb tags;
    node(r.a:"admin_centre");
    out;
  `;

  let overpassData;
  try {
    overpassData = await executeOverpassQuery(query);
  } catch {
    return null; // Transport errors trigger Nominatim fallback
  }

  const validationResult = OverpassResponseSchema.safeParse(overpassData);
  if (!validationResult.success) {
    log.error("Invalid Overpass response", { error: validationResult.error });
    return null;
  }

  const elements = validationResult.data.elements ?? [];
  const rel = elements.find((e): e is OSMRelation => e.type === "relation");
  if (!rel) return null;

  const adminCentreNode = elements.find(
    (e): e is OSMNode => e.type === "node"
  );
  const adminCentre = adminCentreNode
    ? { lat: adminCentreNode.lat, lon: adminCentreNode.lon }
    : null;

  // Exclude the admin_centre node from the stored area geojson
  const geojson = convertOverpassToGeoJSON({
    ...validationResult.data,
    elements: [rel],
  });

  return {
    name: rel.tags?.name || `Relation ${relationId}`,
    names: extractOsmNames(rel.tags),
    bounds: rel.bounds
      ? `${rel.bounds.minlat},${rel.bounds.minlon},${rel.bounds.maxlat},${rel.bounds.maxlon}`
      : null,
    adminCentre,
    geojson: rel,
    convertedGeojson: geojson,
  };
}
