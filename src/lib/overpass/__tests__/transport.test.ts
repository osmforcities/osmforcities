import { describe, it, expect, vi, afterEach } from "vitest";
import {
  executeOverpassQuery,
  countOverpassElements,
  OverpassTimeoutError,
} from "@/lib/overpass/transport";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockCountFetch(total: number) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        elements: [{ type: "count", tags: { total: String(total) } }],
      }),
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("executeOverpassQuery", () => {
  function mockTextFetch(text: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(text),
      } as unknown as Response)
    );
  }

  it("returns parsed data", async () => {
    mockTextFetch(JSON.stringify({ elements: [] }));
    await expect(executeOverpassQuery("query")).resolves.toEqual({ elements: [] });
  });

  // Overpass reports failures inside HTTP 200 bodies.
  it.each([
    {
      name: "structured error",
      body: JSON.stringify({
        remark: "runtime error",
        error: { code: "timeout", message: "query timed out" },
      }),
      message: "Overpass API error: query timed out",
    },
    {
      name: "non-JSON body",
      body: "<html>503</html>",
      message: "Overpass API returned non-JSON response",
    },
    {
      name: "missing elements array",
      body: JSON.stringify({ generator: "Overpass API" }),
      message: "Overpass API returned an unexpected response shape",
    },
  ])("rejects a $name", async ({ body, message }) => {
    mockTextFetch(body);

    await expect(executeOverpassQuery("query")).rejects.toThrow(message);
  });

  // A live timeout comes with empty elements; returning them would read as an
  // area that has nothing.
  it.each([
    { name: "with empty elements", body: { elements: [] } },
    { name: "without elements", body: {} },
  ])("throws OverpassTimeoutError with the remark text, $name", async ({ body }) => {
    const remark = 'runtime error: Query timed out in "query" at line 6 after 22 seconds.';
    mockTextFetch(JSON.stringify({ ...body, remark }));

    const result = executeOverpassQuery("query");
    await expect(result).rejects.toThrow(OverpassTimeoutError);
    await expect(result).rejects.toThrow(remark);
  });
});

describe("countOverpassElements", () => {
  it("parses the total from an out count response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ elements: [{ type: "count", tags: { total: "42" } }] }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(countOverpassElements("[out:json]; rel(1); out;")).resolves.toBe(
      42
    );
    const body = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(decodeURIComponent(body)).toBe("data=[out:json]; rel(1); out count;");
  });

  it("rewrites output statements with modifiers to out count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ elements: [{ type: "count", tags: { total: "7" } }] }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      countOverpassElements("[out:json]; rel(1); out body geom;")
    ).resolves.toBe(7);
    const body = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(decodeURIComponent(body)).toBe("data=[out:json]; rel(1); out count;");
  });

  it("does not shrink the template's own timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ elements: [{ type: "count", tags: { total: "1" } }] }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await countOverpassElements(
      "[out:json][timeout:25]; rel(1); out geom meta;"
    );

    const body = decodeURIComponent(
      String((fetchMock.mock.calls[0][1] as RequestInit).body)
    );
    const timeout = Number(body.match(/\[timeout:(\d+)\]/)?.[1]);
    expect(timeout).toBeGreaterThanOrEqual(25);
  });

  it("aborts after 30 s by default", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    mockCountFetch(1);

    await countOverpassElements("query");

    expect(timeoutSpy).toHaveBeenCalledExactlyOnceWith(30_000);
  });

  it("aborts after the caller's timeoutMs when given", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    mockCountFetch(1);

    await countOverpassElements("query", 200_000);

    expect(timeoutSpy).toHaveBeenCalledExactlyOnceWith(200_000);
  });

  it("returns 0 for a genuinely empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            elements: [{ type: "count", tags: { total: "0" } }],
          }),
      } as unknown as Response)
    );

    await expect(countOverpassElements("query")).resolves.toBe(0);
  });

  it("throws OverpassTimeoutError on a 504 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 504 } as Response)
    );

    await expect(countOverpassElements("query")).rejects.toThrow(
      OverpassTimeoutError
    );
  });

  it("throws OverpassTimeoutError when the timeout fires while reading the body", async () => {
    // Overpass sends the 200 headers at once and the body only when the query
    // ends, so the abort usually lands in json(), not in fetch()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.reject(
            new DOMException("The operation was aborted due to timeout", "TimeoutError")
          ),
      } as unknown as Response)
    );

    await expect(countOverpassElements("query")).rejects.toThrow(
      OverpassTimeoutError
    );
  });

  it("treats a 200 + remark (timed out / out of memory) as a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            elements: [],
            remark: "runtime error: Query ran out of memory",
          }),
      } as unknown as Response)
    );

    await expect(countOverpassElements("query")).rejects.toThrow(
      OverpassTimeoutError
    );
  });

  it("throws a generic error when the response has no total and no remark", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ elements: [] }),
      } as unknown as Response)
    );

    await expect(countOverpassElements("query")).rejects.toThrow(
      "Unexpected response format from Overpass count query"
    );
  });
});
