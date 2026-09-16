import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchDatasetSnapshot,
  snapshotDatasetColumns,
  DatasetTooLargeError,
  DatasetSizeCheckTimeoutError,
  type DatasetSnapshot,
} from "@/lib/dataset-snapshot";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { MAX_DATASET_BYTES, OVERPASS_BYTES_PER_ELEMENT_ESTIMATE } from "@/lib/constants";
import {
  executeOverpassQueryWithByteLimit,
  OverpassResponseTooLargeError,
} from "@/lib/overpass/transport";

// TILES_ENABLED is a module-load constant; a getter lets each test flip it.
const flags = vi.hoisted(() => ({ tiles: false }));
vi.mock("@/lib/dataset-tiles", () => ({
  get TILES_ENABLED() {
    return flags.tiles;
  },
}));

// Real transport; the byte-limited fetch is wrapped so a test can make it
// overflow without streaming 25 MB through the fetch mock.
vi.mock("@/lib/overpass/transport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/overpass/transport")>();
  return {
    ...actual,
    executeOverpassQueryWithByteLimit: vi.fn(actual.executeOverpassQueryWithByteLimit),
  };
});

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

const overCapCount =
  Math.ceil(MAX_DATASET_BYTES / OVERPASS_BYTES_PER_ELEMENT_ESTIMATE) + 1;

// Narrows the snapshot union for the full-fetch assertions below.
async function fetchFullSnapshot(
  ...args: Parameters<typeof fetchDatasetSnapshot>
) {
  const snapshot = await fetchDatasetSnapshot(...args);
  if (snapshot.tilesOnly) throw new Error("expected a full snapshot");
  return snapshot;
}

describe("fetchDatasetSnapshot", () => {
  beforeEach(() => {
    // Lane off: these tests cover the classic size-capped path.
    vi.stubEnv("TILER_URL", "");
    flags.tiles = false;
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
    vi.unstubAllEnvs();
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
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
    expect(snapshot.dataCount).toBe(2);
  });

  it("returns geojson as a FeatureCollection", async () => {
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
    expect(snapshot.geojson.type).toBe("FeatureCollection");
    expect(Array.isArray(snapshot.geojson.features)).toBe(true);
  });

  it("returns stats with editorsCount matching unique users", async () => {
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
    expect(snapshot.stats.editorsCount).toBe(2);
  });

  it("persists recency bands summing to the timestamped features / distinct mappers", async () => {
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
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
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
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
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
    // Both node fixtures carry a `name` tag -> one entry, count 2.
    expect(snapshot.stats.tagCounts).toEqual([{ key: "name", count: 2 }]);
  });

  it("persists filter dimensions for the template's curated tags", async () => {
    templateFindUnique.mockResolvedValue({
      filterableTags: ["name", "surface"],
    } as never);

    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");

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
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");

    expect(snapshot.stats.filterDimensions?.map((d) => d.key)).toEqual(["age"]);
  });

  it("returns bbox as null when no features produced", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation({ ...mockOverpassData, elements: [] })
    );
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
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

    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
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

    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
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

describe("fetchDatasetSnapshot — tiles-only lane", () => {
  const freshTooLarge = {
    id: "check-1",
    areaId: 1,
    templateId: "tpl-1",
    status: "too_large",
    estimatedBytes: 20_000_000,
    actualBytes: null,
    checkedAt: new Date(),
  };

  beforeEach(() => {
    vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
    flags.tiles = true;
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
    vi.unstubAllEnvs();
  });

  it("routes an over-cap estimate to a tiles-only snapshot, records no verdict, skips the fetch", async () => {
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData, overCapCount));
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot).toEqual({
      tilesOnly: true,
      geojson: null,
      stats: null,
      bbox: null,
      // The probe's element count: the tiler submit sizes budgets from it.
      dataCount: overCapCount,
    });
    // A 24h too_large verdict would block every retry of a routable dataset.
    expect(upsert).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("refuses over-cap when the tiler is on but the map does not render tiles", async () => {
    // A geojson-less row would be permanently unviewable.
    flags.tiles = false;
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData, overCapCount));
    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetTooLargeError
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "too_large" }),
      })
    );
  });

  it("ignores a fresh too_large verdict and re-probes", async () => {
    findUnique.mockResolvedValue(freshTooLarge as never);
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData, overCapCount));
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.tilesOnly).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("still honours a fresh too_large verdict when the render flag is off", async () => {
    flags.tiles = false;
    findUnique.mockResolvedValue(freshTooLarge as never);
    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetTooLargeError
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("still honours a fresh timeout verdict", async () => {
    // Unlike too_large, the lane does not bypass it: no probe, no retry.
    findUnique.mockResolvedValue({ ...freshTooLarge, status: "timeout" } as never);
    await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
      DatasetSizeCheckTimeoutError
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("routes a response that overflows mid-fetch with an over-cap element count", async () => {
    // Probe says under cap; the byte limit says otherwise.
    vi.stubGlobal("fetch", mockFetchImplementation(mockOverpassData, 7));
    vi.mocked(executeOverpassQueryWithByteLimit).mockRejectedValueOnce(
      new OverpassResponseTooLargeError(MAX_DATASET_BYTES + 1, MAX_DATASET_BYTES)
    );
    const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");
    expect(snapshot.tilesOnly).toBe(true);
    // Stored dataCount must read as over-cap to the tiler submit, or the bake
    // goes out on default budgets.
    expect(snapshot.dataCount * OVERPASS_BYTES_PER_ELEMENT_ESTIMATE).toBeGreaterThan(
      MAX_DATASET_BYTES
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("leaves under-cap datasets on the full-snapshot path", async () => {
    const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");
    expect(snapshot.tilesOnly).toBeFalsy();
    expect(snapshot.geojson.type).toBe("FeatureCollection");
    expect(snapshot.dataCount).toBe(2);
  });
});

describe("fetchDatasetSnapshot — count-probe retry", () => {
  const timedOut = { ok: false, status: 504 } as Response;
  const serverError = { ok: false, status: 500 } as Response;
  const outOfMemory = {
    elements: [],
    remark: "runtime error: Query ran out of memory",
  };
  const raisedBudgetsQuery =
    "[out:json][timeout:180][maxsize:1073741824]; rel(1); out count;";

  function requestBody(call: unknown[]): string {
    return decodeURIComponent(
      ((call[1] as RequestInit).body as string).replace("data=", "")
    );
  }

  function expectTimeoutVerdict() {
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "timeout" }),
      })
    );
  }

  beforeEach(() => {
    vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
    flags.tiles = true;
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    upsert.mockReset();
    upsert.mockResolvedValue({} as never);
    templateFindUnique.mockReset();
    templateFindUnique.mockResolvedValue({ filterableTags: [] } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("retry succeeds", () => {
    it("routes an over-cap retry count to a tiles-only snapshot, recording no verdict", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(timedOut)
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      const snapshot = await fetchDatasetSnapshot(
        1,
        "[out:json][timeout:25]; rel(1); out;",
        "tpl-1"
      );

      expect(snapshot).toEqual({
        tilesOnly: true,
        geojson: null,
        stats: null,
        bbox: null,
        dataCount: overCapCount,
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(upsert).not.toHaveBeenCalled();
    });

    // An area Overpass has never evaluated is slow the first time even when
    // small. The retry is what gets it through, and a small answer must land
    // a regular snapshot, not a tiles-only one.
    it("fetches a full snapshot when the retry count is under cap (cold area)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(timedOut)
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(2)))
        .mockReturnValue(makeFetchResponse(mockOverpassData));
      vi.stubGlobal("fetch", fetchMock);

      const snapshot = await fetchFullSnapshot(1, "query", "tpl-1");

      expect(snapshot.geojson.type).toBe("FeatureCollection");
      expect(snapshot.dataCount).toBe(2);
      // probe, retry, full fetch
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(upsert).toHaveBeenCalledOnce();
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: "ok" }),
        })
      );
    });

    it("retries an out-of-memory probe (200 + remark), not only a 504", async () => {
      const fetchMock = vi
        .fn()
        .mockReturnValueOnce(makeFetchResponse(outOfMemory))
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      const snapshot = await fetchDatasetSnapshot(1, "query", "tpl-1");

      expect(snapshot.tilesOnly).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("gives the retry a client timeout longer than the raised server budget", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(timedOut)
          .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)))
      );

      await fetchDatasetSnapshot(1, "query", "tpl-1");

      expect(timeoutSpy.mock.calls).toEqual([[30_000], [200_000]]);
    });
  });

  describe("retry query", () => {
    it("replaces the template's timeout with the raised budgets", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(timedOut)
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      await fetchDatasetSnapshot(1, "[out:json][timeout:25]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[1])).toBe(raisedBudgetsQuery);
    });

    it("inserts the raised budgets after [out:json] when the query has no timeout", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(timedOut)
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      await fetchDatasetSnapshot(1, "[out:json]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[1])).toBe(raisedBudgetsQuery);
    });

    it("leaves the first probe on the template's own budgets", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(timedOut)
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      await fetchDatasetSnapshot(1, "[out:json][timeout:25]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[0])).toBe(
        "[out:json][timeout:25]; rel(1); out count;"
      );
    });
  });

  describe("retry fails", () => {
    it("records a timeout verdict when the retry also times out", async () => {
      const fetchMock = vi.fn().mockResolvedValue(timedOut);
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
        DatasetSizeCheckTimeoutError
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expectTimeoutVerdict();
    });

    it("rethrows a non-timeout retry failure without recording a verdict", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(timedOut).mockResolvedValueOnce(serverError)
      );

      await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
        "Overpass API error: 500"
      );
      expect(upsert).not.toHaveBeenCalled();
    });

    it("does not retry a non-timeout first failure", async () => {
      const fetchMock = vi.fn().mockResolvedValue(serverError);
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
        "Overpass API error: 500"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(upsert).not.toHaveBeenCalled();
    });
  });

  describe("lane off: no retry", () => {
    it("records a timeout on the first failure when the tiler is disabled", async () => {
      vi.stubEnv("TILER_URL", "");
      const fetchMock = vi.fn().mockResolvedValue(timedOut);
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
        DatasetSizeCheckTimeoutError
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expectTimeoutVerdict();
    });

    // The tiler alone is not enough: a tiles-only row needs the map to render
    // tiles, so the retry must not route anything while that flag is off.
    it("records a timeout on the first failure when the map does not render tiles", async () => {
      flags.tiles = false;
      const fetchMock = vi.fn().mockResolvedValue(timedOut);
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchDatasetSnapshot(1, "query", "tpl-1")).rejects.toThrow(
        DatasetSizeCheckTimeoutError
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expectTimeoutVerdict();
    });
  });
});

describe("snapshotDatasetColumns", () => {
  const mostRecent = new Date("2025-01-01T00:00:00Z");
  const makeSnapshot = (): Extract<DatasetSnapshot, { tilesOnly?: false }> => ({
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

  it("writes only geojson, dataCount and lastChecked for a tiles-only snapshot", () => {
    const cols = snapshotDatasetColumns({
      tilesOnly: true,
      geojson: null,
      stats: null,
      bbox: null,
      dataCount: overCapCount,
    });
    // No stats/bbox/denormalized keys: a refresh must not wipe what the tiler
    // filled. lastChecked is the only freshness write a tiles-only row gets.
    expect(Object.keys(cols).sort()).toEqual(["dataCount", "geojson", "lastChecked"]);
    expect(cols.geojson).toBe(Prisma.JsonNull);
    expect(cols.dataCount).toBe(overCapCount);
    expect(cols.lastChecked).toBeInstanceOf(Date);
  });
});
