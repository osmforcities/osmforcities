import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { fetchOsmRelationData } from "@/lib/area-boundary";
import { getAreaDetailsById } from "@/lib/nominatim";
import { mergeAreaNames, toStoredNames } from "@/lib/area-name";
import { AREA_INFO_TTL_DAYS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const logger = createLogger("area-refresh");

export function isAreaInfoStale(refreshedAt: Date | null): boolean {
  if (!refreshedAt) return true;
  const ttlMs = AREA_INFO_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - refreshedAt.getTime() > ttlMs;
}

// Nominatim's lat/lon can be a bad centroid (e.g. Luanda province resolves
// to an empty interior point), so the OSM admin_centre member wins.
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

  // Overpass carries the full name:* set, so it wins over Nominatim on conflicts.
  const mergedNames = mergeAreaNames(areaDetails?.names, osmData?.names);

  return prisma.area.update({
    where: { id: areaId },
    data: {
      name: osmData?.name ?? areaDetails?.name ?? undefined,
      names: toStoredNames(mergedNames),
      bounds: osmData?.bounds ?? undefined,
      countryCode: areaDetails?.countryCode ?? undefined,
      centerLat: center?.centerLat,
      centerLon: center?.centerLon,
      // Nominatim-only refresh stays stale so the next view retries the bounds
      ...(osmData ? { refreshedAt: new Date() } : {}),
      ...(boundsChanged ? { geojson: Prisma.JsonNull } : {}),
    },
  });
}

type RefreshableArea = {
  id: number;
  bounds: string | null;
  refreshedAt: Date | null;
};

export async function refreshAreaInfoIfStale<T extends RefreshableArea>(
  area: T
) {
  if (!isAreaInfoStale(area.refreshedAt)) return area;
  try {
    return (await refreshAreaInfo(area.id, area.bounds)) ?? area;
  } catch (error) {
    logger.error("Failed to refresh area info", { areaId: area.id, error });
    return area;
  }
}
