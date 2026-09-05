import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchDatasetSnapshot,
  snapshotDatasetColumns,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
  type DatasetSnapshot,
} from "@/lib/dataset-snapshot";
import { prisma } from "@/lib/db";
import { MAX_DATASET_BYTES, OVERPASS_BYTES_PER_ELEMENT_ESTIMATE } from "@/lib/constants";

vi.mock("@/lib/db", () => ({
  prisma: {
    areaSizeCheck: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    template: {
      findUnique: vi.fn(),
    },
  },
}));

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
  const text = JSON.stringify(data);
  return Promise.resolve({
    ok: true,
    status: 200,
    body: null,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(text),
  } as unknown as Response);
}

function makeCountResponse(total: number) {
  return {
    elements: [{ type: "count", tags: { total: String(total) } }],
  };
}

function mockFetchImplementation(fullData: unknown, count = 2) {
  return vi.fn()
    .mockReturnValueOnce(makeFetchResponse(makeCountResponse(count)))
    .mockReturnValue(makeFetchResponse(fullData));
}

const findUnique = vi.mocked(prisma.areaSizeCheck.findUnique);
const upsert = vi.mocked(prisma.areaSizeCheck.upsert);
const templateFindUnique = vi.mocked(prisma.template.findUnique);

describe("fetchDatasetSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData));
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    upsert.mockReset();
    upsert.mockResolvedValue({} as never);
    templateFindUnique.mockReset();
    templateFindUnique.mockResolvedValue({ filterableTags: [] } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("substitutes {OSM_RELATION_ID} in the raw query before calling Overpass", async () => {
    const fetchSpy = vi.mocked(fetch);
    await fetchDatasetSnapshot(12345, "[out:json]; rel({OSM_RELATION_ID}); out;", "tpl-1");
    const countCall = fetchSpy.mock.calls[0];
    const countBody = (countCall[1] as RequestInit).body as string;
    expect(decodeURIComponent(countBody.replace("data=", ""))).toBe(
      "[out:json]; rel(12345); out count;"
    );
    const fullCall = fetchSpy.mock.calls[1];
    const body = (fullCall[1] as RequestInit).body as string;
    expect(decodeURIComponent(body.replace("data=", ""))).toBe(
      "[out:json]; rel(12345); out;"
    );
  });

  it("returns correct dataCount from features length", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.dataCount).toBe(2);
  });

  it("returns geojson as a FeatureCollection", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.geojson.type).toBe("FeatureCollection");
    expect(Array.isArray(snapshot.geojson.features)).toBe(true);
  });

  it("returns stats with editorsCount matching unique users", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.stats.editorsCount).toBe(2);
  });

  it("persists recency bands summing to the timestamped features / distinct mappers", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    // Exact buckets depend on the current date (covered in dataset-recency
    // tests); here assert shape and totals: 2 timestamped features, 2 mappers.
    expect(snapshot.stats.editRecencyBands).toHaveLength(4);
    expect(snapshot.stats.mapperRecencyBands).toHaveLength(4);
    expect(
      snapshot.stats.editRecencyBands?.reduce((a, b) => a + b, 0)
    ).toBe(2);
    expect(
      snapshot.stats.mapperRecencyBands?.reduce((a, b) => a + b, 0)
    ).toBe(2);
  });

  it("persists geometry mix from the geojson features", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    // 2 node fixtures -> 2 Point features, no lines/areas.
    expect(snapshot.stats.geometryMix).toEqual({
      points: 2,
      lines: 0,
      areas: 0,
      lineKm: 0,
      areaKm2: 0,
    });
  });

  it("persists tag counts from the geojson features", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    // Both node fixtures carry a `name` tag -> one entry, count 2.
    expect(snapshot.stats.tagCounts).toEqual([{ key: "name", count: 2 }]);
  });

  it("persists filter dimensions for the template's curated tags", async () => {
    templateFindUnique.mockResolvedValue({
      filterableTags: ["name", "surface"],
    } as never);

    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");

    // Both fixtures carry `name`; none carry `surface` — kept anyway
    // (keepEmpty), since a 100%-Missing curated key is the finding.
    expect(snapshot.stats.filterDimensions).toEqual([
      {
        key: "name",
        kind: "tag",
        values: [
          { value: "Test Node", count: 1 },
          { value: "Old Node", count: 1 },
        ],
        missing: 0,
      },
      { key: "surface", kind: "tag", values: [], missing: 2 },
      // 2025/2022 fixtures are both well past 90 days
      { key: "age", kind: "age", values: [{ value: "very-old", count: 2 }], missing: 0 },
    ]);
  });

  it("stores an age-only dimension list when the template curates no tags", async () => {
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");

    expect(snapshot.stats.filterDimensions?.map((d) => d.key)).toEqual(["age"]);
  });

  it("returns bbox as null when no features produced", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation({ ...mockOverpassData, elements: [] })
    );
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.bbox).toBeNull();
  });

  it("replaces all occurrences of {OSM_RELATION_ID} in the template", async () => {
    const fetchSpy = vi.mocked(fetch);
    await fetchDatasetSnapshot(99, "rel({OSM_RELATION_ID}); area({OSM_RELATION_ID});", "tpl-1");
    const fullCall = fetchSpy.mock.calls[1];
    const body = (fullCall[1] as RequestInit).body as string;
    expect(decodeURIComponent(body.replace("data=", ""))).toBe(
      "rel(99); area(99);"
    );
  });

  it("records an ok verdict after a successful fetch", async () => {
    await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { areaId_templateId: { areaId: 1, templateId: "tpl-1" } },
        create: expect.objectContaining({ status: "ok" }),
      })
    );
  });

  it("rejects when the count estimate exceeds the byte cap, recording too_large", async () => {
    const overCapCount =
      Math.ceil(MAX_DATASET_BYTES / OVERPASS_BYTES_PER_ELEMENT_ESTIMATE) + 1;
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation(mockOverpassData, overCapCount)
    );
    const fetchSpy = vi.mocked(fetch);

    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetTooLargeError
    );
    // only the count query ran; the full fetch was never attempted
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "too_large" }),
      })
    );
  });

  it("rejects instantly from a fresh too_large verdict without calling Overpass", async () => {
    findUnique.mockResolvedValue({
      id: "check-1",
      areaId: 1,
      templateId: "tpl-1",
      status: "too_large",
      estimatedBytes: 20_000_000,
      actualBytes: null,
      checkedAt: new Date(),
    });
    const fetchSpy = vi.mocked(fetch);

    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetTooLargeError
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("re-checks against Overpass when the cached verdict is stale", async () => {
    findUnique.mockResolvedValue({
      id: "check-1",
      areaId: 1,
      templateId: "tpl-1",
      status: "too_large",
      estimatedBytes: 20_000_000,
      actualBytes: null,
      checkedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });

    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.dataCount).toBe(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "ok" }),
      })
    );
  });

  it("rejects instantly from a fresh timeout verdict", async () => {
    findUnique.mockResolvedValue({
      id: "check-1",
      areaId: 1,
      templateId: "tpl-1",
      status: "timeout",
      estimatedBytes: null,
      actualBytes: null,
      checkedAt: new Date(),
    });
    const fetchSpy = vi.mocked(fetch);

    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetSizeCheckTimeoutError
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // A timeout is usually transient load, unlike too_large — it must expire in
  // minutes, not hold the area+template hostage for a full day.
  it("retries a timeout verdict well before the too_large TTL expires", async () => {
    findUnique.mockResolvedValue({
      id: "check-1",
      areaId: 1,
      templateId: "tpl-1",
      status: "timeout",
      estimatedBytes: null,
      actualBytes: null,
      checkedAt: new Date(Date.now() - 31 * 60 * 1000),
    });

    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.dataCount).toBe(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "ok" }),
      })
    );
  });

  it("still honours a too_large verdict at an age that expires a timeout", async () => {
    findUnique.mockResolvedValue({
      id: "check-1",
      areaId: 1,
      templateId: "tpl-1",
      status: "too_large",
      estimatedBytes: 20_000_000,
      actualBytes: null,
      checkedAt: new Date(Date.now() - 31 * 60 * 1000),
    });
    const fetchSpy = vi.mocked(fetch);

    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetTooLargeError
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("snapshotDatasetColumns", () => {
  const mostRecent = new Date("2025-01-01T00:00:00Z");
  const makeSnapshot = (): DatasetSnapshot => ({
    geojson: { type: "FeatureCollection", features: [] },
    bbox: [-0.2, 51.5, -0.1, 51.6],
    dataCount: 2,
    stats: {
      editorsCount: 3,
      elementVersionsCount: 5,
      changesetsCount: 4,
      oldestElement: new Date("2022-01-01T00:00:00Z"),
      mostRecentElement: mostRecent,
      averageElementAge: 100,
      averageElementVersion: 1.5,
      recentActivity: { elementsEdited: 2, changesets: 1, editors: 1 },
      qualityMetrics: {
        staleElementsCount: 1,
        recentlyUpdatedElementsCount: 1,
        staleElementsPercentage: 50,
        recentlyUpdatedElementsPercentage: 50,
      },
    },
  });

  it("derives the denormalized columns from stats", () => {
    const cols = snapshotDatasetColumns(makeSnapshot());
    expect(cols.lastEditedAt).toEqual(mostRecent);
    expect(cols.contributorsCount).toBe(3);
    expect(cols.recentlyEditedCount).toBe(2);
    expect(cols.dataCount).toBe(2);
    expect(cols.lastChecked).toBeInstanceOf(Date);
  });

  it("maps a null mostRecentElement to null lastEditedAt and passes null bbox through", () => {
    const snapshot = makeSnapshot();
    snapshot.stats.mostRecentElement = null;
    snapshot.bbox = null;
    const cols = snapshotDatasetColumns(snapshot);
    expect(cols.lastEditedAt).toBeNull();
    expect(cols.bbox).toBeNull();
  });

  it("clones the JSON blobs and serializes Dates inside stats to ISO strings", () => {
    const snapshot = makeSnapshot();
    const cols = snapshotDatasetColumns(snapshot);
    expect(cols.geojson).not.toBe(snapshot.geojson);
    expect(cols.geojson).toEqual(snapshot.geojson);
    expect(cols.stats).not.toBe(snapshot.stats);
    expect(cols.stats.mostRecentElement).toBe("2025-01-01T00:00:00.000Z");
    expect(cols.stats.oldestElement).toBe("2022-01-01T00:00:00.000Z");
    expect(cols.bbox).not.toBe(snapshot.bbox);
    expect(cols.bbox).toEqual(snapshot.bbox);
  });
});
