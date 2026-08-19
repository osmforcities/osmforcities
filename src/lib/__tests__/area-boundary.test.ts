import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    area: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/overpass/transport", () => ({
  executeOverpassQuery: vi.fn(),
  convertOverpassToGeoJSON: vi.fn().mockReturnValue({
    type: "FeatureCollection",
    features: [],
  }),
}));

// unstable_cache is identity here so the tests exercise the real read path;
// revalidateTag is a no-op (it throws without a request store outside Next).
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

import { fetchOsmRelationData, getAreaBoundary } from "@/lib/area-boundary";
import { prisma } from "@/lib/db";
import {
  executeOverpassQuery,
  convertOverpassToGeoJSON,
} from "@/lib/overpass/transport";

const mockExecuteOverpassQuery = vi.mocked(executeOverpassQuery);
const mockConvert = vi.mocked(convertOverpassToGeoJSON);
const mockFindUnique = vi.mocked(prisma.area.findUnique);
const mockUpdate = vi.mocked(prisma.area.update);

/** A real boundary: >5 points in the outer ring. */
const storedPolygon = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [13.0, -8.9],
            [13.1, -8.9],
            [13.2, -8.85],
            [13.2, -8.8],
            [13.1, -8.75],
            [13.0, -8.8],
            [13.0, -8.9],
          ],
        ],
      },
    },
  ],
};

/** A bbox rectangle: exactly 5 points, treated as "no real boundary stored". */
const storedBbox = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [13.0, -8.9],
            [13.2, -8.9],
            [13.2, -8.7],
            [13.0, -8.7],
            [13.0, -8.9],
          ],
        ],
      },
    },
  ],
};

const luandaRelation = {
  type: "relation",
  id: 1802546,
  tags: { name: "Luanda", boundary: "administrative" },
  bounds: {
    minlat: -10.4562358,
    minlon: 12.7897792,
    maxlat: -8.5800243,
    maxlon: 14.6216669,
  },
};

const adminCentreNode = {
  type: "node",
  id: 27564941,
  lat: -8.8272699,
  lon: 13.2439512,
  tags: { name: "Luanda", place: "city" },
};

describe("fetchOsmRelationData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvert.mockReturnValue({ type: "FeatureCollection", features: [] });
  });

  it("returns admin_centre coordinates when the member node is present", async () => {
    mockExecuteOverpassQuery.mockResolvedValueOnce({
      elements: [luandaRelation, adminCentreNode],
    } as never);

    const result = await fetchOsmRelationData(1802546);

    expect(result?.adminCentre).toEqual({ lat: -8.8272699, lon: 13.2439512 });
    expect(result?.name).toBe("Luanda");
    expect(result?.bounds).toBe("-10.4562358,12.7897792,-8.5800243,14.6216669");
  });

  it("returns null adminCentre when the relation has no admin_centre member", async () => {
    mockExecuteOverpassQuery.mockResolvedValueOnce({
      elements: [luandaRelation],
    } as never);

    const result = await fetchOsmRelationData(1802546);

    expect(result?.adminCentre).toBeNull();
  });

  it("finds the relation even when the node element comes first", async () => {
    mockExecuteOverpassQuery.mockResolvedValueOnce({
      elements: [adminCentreNode, luandaRelation],
    } as never);

    const result = await fetchOsmRelationData(1802546);

    expect(result?.name).toBe("Luanda");
    expect(result?.adminCentre).toEqual({ lat: -8.8272699, lon: 13.2439512 });
  });

  it("converts only the relation element to geojson (no stray point feature)", async () => {
    mockExecuteOverpassQuery.mockResolvedValueOnce({
      elements: [luandaRelation, adminCentreNode],
    } as never);

    await fetchOsmRelationData(1802546);

    const convertArg = mockConvert.mock.calls[0][0] as { elements: unknown[] };
    expect(convertArg.elements).toHaveLength(1);
    expect((convertArg.elements[0] as { type: string }).type).toBe("relation");
  });

  it("returns null on transport error", async () => {
    mockExecuteOverpassQuery.mockRejectedValueOnce(new Error("timeout"));

    expect(await fetchOsmRelationData(1802546)).toBeNull();
  });

  it("returns null when no relation element is present", async () => {
    mockExecuteOverpassQuery.mockResolvedValueOnce({
      elements: [adminCentreNode],
    } as never);

    expect(await fetchOsmRelationData(1802546)).toBeNull();
  });
});

describe("getAreaBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvert.mockReturnValue({ type: "FeatureCollection", features: [] });
  });

  it("returns the stored boundary without querying Overpass", async () => {
    mockFindUnique.mockResolvedValueOnce({ geojson: storedPolygon } as never);

    const result = await getAreaBoundary(1802546);

    expect(result?.features).toHaveLength(1);
    expect(mockExecuteOverpassQuery).not.toHaveBeenCalled();
  });

  it("simplifies the stored boundary rather than returning it verbatim", async () => {
    mockFindUnique.mockResolvedValueOnce({ geojson: storedPolygon } as never);

    const result = await getAreaBoundary(1802546);

    const ring = (result?.features[0].geometry as { coordinates: number[][][] })
      .coordinates[0];
    const storedRing = storedPolygon.features[0].geometry.coordinates[0];
    expect(ring.length).toBeLessThanOrEqual(storedRing.length);
    // Still a closed ring after simplification.
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("falls back to Overpass when only a bbox rectangle is stored", async () => {
    mockFindUnique.mockResolvedValueOnce({ geojson: storedBbox } as never);
    mockExecuteOverpassQuery.mockResolvedValueOnce({ elements: [] } as never);
    mockConvert.mockReturnValueOnce({
      type: "FeatureCollection",
      features: [
        {
          id: "relation/1802546",
          type: "Feature",
          properties: {},
          geometry: storedPolygon.features[0].geometry,
        },
      ],
    } as never);

    const result = await getAreaBoundary(1802546);

    expect(mockExecuteOverpassQuery).toHaveBeenCalledOnce();
    // The freshly fetched boundary is written back for the next caller.
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(result?.features).toHaveLength(1);
  });

  it("falls back to Overpass when nothing is stored", async () => {
    mockFindUnique.mockResolvedValueOnce({ geojson: null } as never);
    mockExecuteOverpassQuery.mockResolvedValueOnce({ elements: [] } as never);
    mockConvert.mockReturnValueOnce({
      type: "FeatureCollection",
      features: [
        {
          id: "relation/1802546",
          type: "Feature",
          properties: {},
          geometry: storedPolygon.features[0].geometry,
        },
      ],
    } as never);

    expect(await getAreaBoundary(1802546)).not.toBeNull();
    expect(mockExecuteOverpassQuery).toHaveBeenCalledOnce();
  });

  it("returns null when nothing is stored and Overpass fails", async () => {
    mockFindUnique.mockResolvedValueOnce({ geojson: null } as never);
    mockExecuteOverpassQuery.mockRejectedValueOnce(new Error("timeout"));

    expect(await getAreaBoundary(1802546)).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
