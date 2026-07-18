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

  it("throws OverpassTimeoutError on a 504 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 504 } as Response)
    );

    await expect(countOverpassElements("query")).rejects.toThrow(
      OverpassTimeoutError
    );
  });
});
