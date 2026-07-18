import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    area: {
      update: vi.fn().mockResolvedValue({ id: 1802546 }),
    },
  },
}));

vi.mock("@/lib/area-boundary", () => ({
  fetchOsmRelationData: vi.fn(),
}));

vi.mock("@/lib/nominatim", () => ({
  getAreaDetailsById: vi.fn(),
}));

import {
  isAreaInfoStale,
  refreshAreaInfo,
  resolveAreaCenter,
} from "@/lib/area-refresh";
import { fetchOsmRelationData } from "@/lib/area-boundary";
import { getAreaDetailsById } from "@/lib/nominatim";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const mockFetchOsmRelationData = vi.mocked(fetchOsmRelationData);
const mockGetAreaDetailsById = vi.mocked(getAreaDetailsById);
const mockAreaUpdate = vi.mocked(prisma.area.update);

const luandaOsmData = {
  name: "Luanda",
  bounds: "-10.456,12.789,-8.580,14.621",
  adminCentre: { lat: -8.8272699, lon: 13.2439512 },
  geojson: {},
  convertedGeojson: { type: "FeatureCollection", features: [] },
};

const luandaNominatim = {
  name: "Luanda",
  countryCode: "ao",
  centerLat: -9.5180344,
  centerLon: 13.535676,
};

describe("isAreaInfoStale", () => {
  it("is stale when refreshedAt is null", () => {
    expect(isAreaInfoStale(null)).toBe(true);
  });

  it("is stale when older than 30 days", () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    expect(isAreaInfoStale(fortyDaysAgo)).toBe(true);
  });

  it("is fresh within 30 days", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isAreaInfoStale(yesterday)).toBe(false);
  });
});

describe("resolveAreaCenter", () => {
  it("prefers the OSM admin_centre over the Nominatim center", () => {
    expect(
      resolveAreaCenter(luandaOsmData as never, luandaNominatim as never)
    ).toEqual({ centerLat: -8.8272699, centerLon: 13.2439512 });
  });

  it("falls back to the Nominatim center without admin_centre", () => {
    expect(
      resolveAreaCenter(
        { ...luandaOsmData, adminCentre: null } as never,
        luandaNominatim as never
      )
    ).toEqual({ centerLat: -9.5180344, centerLon: 13.535676 });
  });

  it("returns null when neither source has a center", () => {
    expect(
      resolveAreaCenter(
        { ...luandaOsmData, adminCentre: null } as never,
        { ...luandaNominatim, centerLat: undefined, centerLon: undefined } as never
      )
    ).toBeNull();
  });
});

describe("refreshAreaInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes refreshed fields with the admin_centre center and stamps refreshedAt", async () => {
    mockFetchOsmRelationData.mockResolvedValueOnce(luandaOsmData as never);
    mockGetAreaDetailsById.mockResolvedValueOnce(luandaNominatim as never);

    await refreshAreaInfo(1802546, luandaOsmData.bounds);

    expect(mockAreaUpdate).toHaveBeenCalledTimes(1);
    const arg = mockAreaUpdate.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 1802546 });
    expect(arg.data).toMatchObject({
      name: "Luanda",
      bounds: luandaOsmData.bounds,
      countryCode: "ao",
      centerLat: -8.8272699,
      centerLon: 13.2439512,
    });
    expect(arg.data.refreshedAt).toBeInstanceOf(Date);
    expect("geojson" in arg.data).toBe(false);
  });

  it("invalidates the cached boundary when bounds changed", async () => {
    mockFetchOsmRelationData.mockResolvedValueOnce(luandaOsmData as never);
    mockGetAreaDetailsById.mockResolvedValueOnce(luandaNominatim as never);

    await refreshAreaInfo(1802546, "-10.0,12.0,-8.0,14.0");

    const arg = mockAreaUpdate.mock.calls[0][0];
    expect(arg.data.geojson).toBe(Prisma.JsonNull);
  });

  it("does not write when both sources fail", async () => {
    mockFetchOsmRelationData.mockResolvedValueOnce(null);
    mockGetAreaDetailsById.mockRejectedValueOnce(new Error("Nominatim down"));

    const result = await refreshAreaInfo(1802546, null);

    expect(result).toBeNull();
    expect(mockAreaUpdate).not.toHaveBeenCalled();
  });

  it("still refreshes from Nominatim when Overpass fails", async () => {
    mockFetchOsmRelationData.mockResolvedValueOnce(null);
    mockGetAreaDetailsById.mockResolvedValueOnce(luandaNominatim as never);

    await refreshAreaInfo(1802546, null);

    const arg = mockAreaUpdate.mock.calls[0][0];
    expect(arg.data).toMatchObject({
      name: "Luanda",
      countryCode: "ao",
      centerLat: -9.5180344,
      centerLon: 13.535676,
    });
    // No bounds from Overpass: leave stored bounds untouched
    expect(arg.data.bounds).toBeUndefined();
  });
});
