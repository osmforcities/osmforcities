import { describe, it, expect, vi, afterEach } from "vitest";
import {
  executeOverpassQueryWithByteLimit,
  countOverpassElements,
  OverpassResponseTooLargeError,
  OverpassTimeoutError,
} from "@/lib/overpass/transport";

function makeStreamResponse(text: string, chunkSize = 8) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
  return Promise.resolve({
    ok: true,
    status: 200,
    body: stream,
  } as unknown as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("executeOverpassQueryWithByteLimit", () => {
  it("returns parsed data when the response is under the limit", async () => {
    const payload = JSON.stringify({ elements: [] });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(makeStreamResponse(payload)));

    const data = await executeOverpassQueryWithByteLimit("query", 1024);
    expect(data.elements).toEqual([]);
  });

  it("throws OverpassResponseTooLargeError once the stream exceeds the limit", async () => {
    const payload = JSON.stringify({ elements: [], padding: "x".repeat(500) });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(makeStreamResponse(payload)));

    await expect(
      executeOverpassQueryWithByteLimit("query", 100)
    ).rejects.toThrow(OverpassResponseTooLargeError);
  });

  it("throws OverpassTimeoutError on a 504 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 504 } as Response)
    );

    await expect(
      executeOverpassQueryWithByteLimit("query", 1024)
    ).rejects.toThrow(OverpassTimeoutError);
  });

  it("surfaces Overpass error remarks from the payload", async () => {
    const payload = JSON.stringify({
      remark: "runtime error",
      error: { code: "timeout", message: "query timed out" },
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(makeStreamResponse(payload)));

    await expect(
      executeOverpassQueryWithByteLimit("query", 1024)
    ).rejects.toThrow("Overpass API error: query timed out");
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

  // The pre-flight exists to protect the data fetch, so it must never be
  // stricter than the fetch it guards: a 10s cap made Overpass abort counting
  // queries that the 25s data query then served without trouble, and the
  // resulting "timeout" verdict blocked the area+template for 24h.
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
