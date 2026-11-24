import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { probeElementCount } from "@/lib/overpass/count-probe";
import { prisma } from "@/lib/db";
import { DATASET_CAP_BYTES, OVERPASS_BYTES_PER_ELEMENT_ESTIMATE } from "@/lib/constants";

vi.mock("@/lib/db", () => ({
  prisma: {
    areaSizeCheck: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

function makeFetchResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    body: null,
    json: () => Promise.resolve(data),
  } as unknown as Response);
}

function makeCountResponse(total: number) {
  return {
    elements: [{ type: "count", tags: { total: String(total) } }],
  };
}

const countAnswering = (total: number) =>
  vi.fn().mockReturnValue(makeFetchResponse(makeCountResponse(total)));

const findUnique = vi.mocked(prisma.areaSizeCheck.findUnique);
const upsert = vi.mocked(prisma.areaSizeCheck.upsert);

const overCapCount =
  Math.ceil(DATASET_CAP_BYTES / OVERPASS_BYTES_PER_ELEMENT_ESTIMATE) + 1;

const verdict = (status: string, checkedAt = new Date()) =>
  ({
    id: "check-1",
    areaId: 1,
    templateId: "tpl-1",
    status,
    estimatedBytes: null,
    actualBytes: null,
    checkedAt,
  }) as never;

function requestBody(call: unknown[]): string {
  return decodeURIComponent(
    ((call[1] as RequestInit).body as string).replace("data=", "")
  );
}

beforeEach(() => {
  findUnique.mockReset();
  findUnique.mockResolvedValue(null);
  upsert.mockReset();
  upsert.mockResolvedValue({} as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("probeElementCount", () => {
  it("asks Overpass for the count of the template's query in the area", async () => {
    const fetchMock = countAnswering(2);
    vi.stubGlobal("fetch", fetchMock);

    await probeElementCount(
      99,
      "[out:json]; rel({OSM_RELATION_ID}); area({OSM_RELATION_ID}); out;",
      "tpl-1"
    );

    expect(requestBody(fetchMock.mock.calls[0])).toBe(
      "[out:json]; rel(99); area(99); out count;"
    );
  });

  it("returns the count of an over-cap dataset with one request and no verdict", async () => {
    const fetchMock = countAnswering(overCapCount);
    vi.stubGlobal("fetch", fetchMock);

    expect(await probeElementCount(1, "query", "tpl-1")).toBe(overCapCount);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns the count of an under-cap dataset with one request too", async () => {
    const fetchMock = countAnswering(2);
    vi.stubGlobal("fetch", fetchMock);

    expect(await probeElementCount(1, "query", "tpl-1")).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a too_large verdict left by the app's removed size refusal", async () => {
    findUnique.mockResolvedValue(verdict("too_large"));
    const fetchMock = countAnswering(overCapCount);
    vi.stubGlobal("fetch", fetchMock);

    expect(await probeElementCount(1, "query", "tpl-1")).toBe(overCapCount);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers a fresh timeout verdict with an unknown count, no probe", async () => {
    findUnique.mockResolvedValue(verdict("timeout"));
    const fetchMock = countAnswering(2);
    vi.stubGlobal("fetch", fetchMock);

    expect(await probeElementCount(1, "query", "tpl-1")).toBe("unknown");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("probes again once a timeout verdict is past its 30 minutes", async () => {
    findUnique.mockResolvedValue(
      verdict("timeout", new Date(Date.now() - 31 * 60 * 1000))
    );
    vi.stubGlobal("fetch", countAnswering(2));

    expect(await probeElementCount(1, "query", "tpl-1")).toBe(2);
  });
});

describe("probeElementCount — retry on raised budgets", () => {
  const timedOut = { ok: false, status: 504 } as Response;
  const serverError = { ok: false, status: 500 } as Response;
  const outOfMemory = {
    elements: [],
    remark: "runtime error: Query ran out of memory",
  };
  const raisedBudgetsQuery =
    "[out:json][timeout:180][maxsize:1073741824]; rel(1); out count;";

  const timeoutThenCount = (total: number) =>
    vi
      .fn()
      .mockResolvedValueOnce(timedOut)
      .mockReturnValueOnce(makeFetchResponse(makeCountResponse(total)));

  describe("retry succeeds", () => {
    it("returns an over-cap retry count, recording no verdict", async () => {
      const fetchMock = timeoutThenCount(overCapCount);
      vi.stubGlobal("fetch", fetchMock);

      expect(
        await probeElementCount(1, "[out:json][timeout:25]; rel(1); out;", "tpl-1")
      ).toBe(overCapCount);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(upsert).not.toHaveBeenCalled();
    });

    // An area Overpass has never evaluated is slow the first time even when small
    it("returns the retry's count when it is under cap (cold area)", async () => {
      const fetchMock = timeoutThenCount(2);
      vi.stubGlobal("fetch", fetchMock);

      expect(await probeElementCount(1, "query", "tpl-1")).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("retries an out-of-memory probe (200 + remark), not only a 504", async () => {
      const fetchMock = vi
        .fn()
        .mockReturnValueOnce(makeFetchResponse(outOfMemory))
        .mockReturnValueOnce(makeFetchResponse(makeCountResponse(overCapCount)));
      vi.stubGlobal("fetch", fetchMock);

      expect(await probeElementCount(1, "query", "tpl-1")).toBe(overCapCount);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("gives the retry a client timeout longer than the raised server budget", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      vi.stubGlobal("fetch", timeoutThenCount(overCapCount));

      await probeElementCount(1, "query", "tpl-1");

      expect(timeoutSpy.mock.calls).toEqual([[30_000], [200_000]]);
    });
  });

  describe("retry query", () => {
    it("replaces the template's timeout with the raised budgets", async () => {
      const fetchMock = timeoutThenCount(overCapCount);
      vi.stubGlobal("fetch", fetchMock);

      await probeElementCount(1, "[out:json][timeout:25]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[1])).toBe(raisedBudgetsQuery);
    });

    it("inserts the raised budgets after [out:json] when the query has no timeout", async () => {
      const fetchMock = timeoutThenCount(overCapCount);
      vi.stubGlobal("fetch", fetchMock);

      await probeElementCount(1, "[out:json]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[1])).toBe(raisedBudgetsQuery);
    });

    it("leaves the first probe on the template's own budgets", async () => {
      const fetchMock = timeoutThenCount(overCapCount);
      vi.stubGlobal("fetch", fetchMock);

      await probeElementCount(1, "[out:json][timeout:25]; rel(1); out;", "tpl-1");

      expect(requestBody(fetchMock.mock.calls[0])).toBe(
        "[out:json][timeout:25]; rel(1); out count;"
      );
    });
  });

  describe("retry fails", () => {
    it("returns an unknown count and records a timeout verdict when the retry also times out", async () => {
      const fetchMock = vi.fn().mockResolvedValue(timedOut);
      vi.stubGlobal("fetch", fetchMock);

      expect(await probeElementCount(1, "query", "tpl-1")).toBe("unknown");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(upsert).toHaveBeenCalledOnce();
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { areaId_templateId: { areaId: 1, templateId: "tpl-1" } },
          create: expect.objectContaining({ status: "timeout" }),
          update: expect.objectContaining({ status: "timeout" }),
        })
      );
    });

    it("rethrows a non-timeout retry failure without recording a verdict", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(timedOut).mockResolvedValueOnce(serverError)
      );

      await expect(probeElementCount(1, "query", "tpl-1")).rejects.toThrow(
        "Overpass API error: 500"
      );
      expect(upsert).not.toHaveBeenCalled();
    });

    it("does not retry a non-timeout first failure", async () => {
      const fetchMock = vi.fn().mockResolvedValue(serverError);
      vi.stubGlobal("fetch", fetchMock);

      await expect(probeElementCount(1, "query", "tpl-1")).rejects.toThrow(
        "Overpass API error: 500"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(upsert).not.toHaveBeenCalled();
    });
  });
});
