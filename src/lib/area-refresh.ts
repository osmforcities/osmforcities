import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { fetchOsmRelationData } from "@/lib/area-boundary";
import { getAreaDetailsById } from "@/lib/nominatim";
import { AREA_INFO_TTL_DAYS } from "@/lib/constants";

export function isAreaInfoStale(refreshedAt: Date | null): boolean {
  if (!refreshedAt) return true;
  const ttlMs = AREA_INFO_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - refreshedAt.getTime() > ttlMs;
}

/**
 * Resolve the map center for an area: the OSM relation's admin_centre member
 * is authoritative; Nominatim's lat/lon is a fallback that can be a bad
 * centroid (e.g. Luanda province resolves to an empty interior point).
 */
export function resolveAreaCenter(
  osmData: Awaited<ReturnType<typeof fetchOsmRelationData>>,
  areaDetails: Awaited<ReturnType<typeof getAreaDetailsById>>
): { centerLat: number; centerLon: number } | null {
  if (osmData?.adminCentre) {
    return {
      centerLat: osmData.adminCentre.lat,
      centerLon: osmData.adminCentre.lon,
    };
  }
  if (areaDetails?.centerLat != null && areaDetails?.centerLon != null) {
    return {
      centerLat: areaDetails.centerLat,
      centerLon: areaDetails.centerLon,
    };
  }
  return null;
}

/**
 * Refresh stored area info (name, bounds, center, countryCode) from OSM and
 * Nominatim, stamping refreshedAt. When the relation's bbox changed, the
 * cached boundary polygon is invalidated so getAreaBoundary refetches it.
 * Returns the updated area, or null when nothing could be fetched (leaving
 * refreshedAt stale so the next view retries).
 */
export async function refreshAreaInfo(
  areaId: number,
  currentBounds: string | null
) {
  const [osmData, areaDetails] = await Promise.all([
    fetchOsmRelationData(areaId),
    getAreaDetailsById(areaId).catch(() => null),
  ]);

  if (!osmData && !areaDetails) return null;

  const center = resolveAreaCenter(osmData, areaDetails);
  const boundsChanged =
    osmData?.bounds != null &&
    currentBounds != null &&
    osmData.bounds !== currentBounds;

  return prisma.area.update({
    where: { id: areaId },
    data: {
      name: osmData?.name ?? areaDetails?.name ?? undefined,
      bounds: osmData?.bounds ?? undefined,
      countryCode: areaDetails?.countryCode ?? undefined,
      centerLat: center?.centerLat,
      centerLon: center?.centerLon,
      refreshedAt: new Date(),
      ...(boundsChanged ? { geojson: Prisma.JsonNull } : {}),
    },
  });
}
