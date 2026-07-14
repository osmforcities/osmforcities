import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchDatasetSnapshot,
  DatasetTooLargeError,
} from "@/lib/dataset-snapshot";
import { prisma } from "@/lib/db";
import { MAX_DATASET_BYTES, OVERPASS_BYTES_PER_ELEMENT_ESTIMATE } from "@/lib/constants";

vi.mock("@/lib/db", () => ({
  prisma: {
    areaSizeCheck: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

describe("fetchDatasetSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData));
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    upsert.mockReset();
    upsert.mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("substitutes {OSM_RELATION_ID} in the raw query before calling Overpass", async () => {
    const fetchSpy = vi.mocked(fetch);
    await fetchDatasetSnapshot(12345, "[out:json]; rel({OSM_RELATION_ID}); out;", "tpl-1");
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
});
