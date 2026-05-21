import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchDatasetSnapshot } from "@/lib/osm";

const mockOverpassData = {
  version: 0.6,
  generator: "Overpass API",
  elements: [
    {
      type: "node" as const,
      id: 1,
      lat: 51.5,
      lon: -0.1,
      tags: { name: "Test Node" },
      user: "mapper1",
      version: 2,
      changeset: 100,
      timestamp: "2025-01-01T00:00:00Z",
    },
    {
      type: "node" as const,
      id: 2,
      lat: 51.6,
      lon: -0.2,
      tags: { name: "Old Node" },
      user: "mapper2",
      version: 1,
      changeset: 200,
      timestamp: "2022-01-01T00:00:00Z",
    },
  ],
};

function makeFetchResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
}

describe("fetchDatasetSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => makeFetchResponse(mockOverpassData)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("substitutes {OSM_RELATION_ID} in the raw query before calling Overpass", async () => {
    const fetchSpy = vi.mocked(fetch);
    await fetchDatasetSnapshot(12345, "[out:json]; rel({OSM_RELATION_ID}); out;");
    const body = (fetchSpy.mock.calls[0][1] as RequestInit).body as string;
    expect(decodeURIComponent(body.replace("data=", ""))).toBe(
      "[out:json]; rel(12345); out;"
    );
  });

  it("returns correct dataCount from elements length", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query");
    expect(snapshot.dataCount).toBe(2);
  });

  it("returns geojson as a FeatureCollection", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query");
    expect(snapshot.geojson.type).toBe("FeatureCollection");
    expect(Array.isArray(snapshot.geojson.features)).toBe(true);
  });

  it("returns stats with editorsCount matching unique users", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query");
    expect(snapshot.stats.editorsCount).toBe(2);
  });

  it("returns bbox as null when no features produced", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        makeFetchResponse({ ...mockOverpassData, elements: [] })
      )
    );
    const snapshot = await fetchDatasetSnapshot(1, "query");
    expect(snapshot.bbox).toBeNull();
  });

  it("replaces all occurrences of {OSM_RELATION_ID} in the template", async () => {
    const fetchSpy = vi.mocked(fetch);
    await fetchDatasetSnapshot(99, "rel({OSM_RELATION_ID}); area({OSM_RELATION_ID});");
    const body = (fetchSpy.mock.calls[0][1] as RequestInit).body as string;
    expect(decodeURIComponent(body.replace("data=", ""))).toBe(
      "rel(99); area(99);"
    );
  });
});
