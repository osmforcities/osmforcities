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

import { fetchOsmRelationData } from "@/lib/area-boundary";
import {
  executeOverpassQuery,
  convertOverpassToGeoJSON,
} from "@/lib/overpass/transport";

const mockExecuteOverpassQuery = vi.mocked(executeOverpassQuery);
const mockConvert = vi.mocked(convertOverpassToGeoJSON);

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
