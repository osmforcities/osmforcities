import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET } from "../route";

const CONTENT = "0123456789abcdef"; // 16 bytes

let dir: string;

const call = (name: string, range?: string) =>
  GET(
    new NextRequest(`http://localhost/api/tiles/${name}`, {
      headers: range ? { range } : {},
    }),
    { params: Promise.resolve({ name }) }
  );

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tiles-route-"));
  vi.stubEnv("TILES_DIR", dir);
  await writeFile(path.join(dir, "d1-100.pmtiles"), CONTENT);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("GET /api/tiles/[name]", () => {
  it("serves the whole archive without a Range header", async () => {
    const res = await call("d1-100.pmtiles");
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-length")).toBe("16");
    expect(await res.text()).toBe(CONTENT);
  });

  it("answers 206 with the requested byte range", async () => {
    const res = await call("d1-100.pmtiles", "bytes=2-5");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 2-5/16");
    expect(res.headers.get("content-length")).toBe("4");
    expect(await res.text()).toBe("2345");
  });

  it("supports open-ended and suffix ranges", async () => {
    const open = await call("d1-100.pmtiles", "bytes=12-");
    expect(open.status).toBe(206);
    expect(await open.text()).toBe("cdef");

    const suffix = await call("d1-100.pmtiles", "bytes=-3");
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get("content-range")).toBe("bytes 13-15/16");
    expect(await suffix.text()).toBe("def");
  });

  it("answers 416 for an unsatisfiable range", async () => {
    const res = await call("d1-100.pmtiles", "bytes=99-");
    expect(res.status).toBe(416);
    expect(res.headers.get("content-range")).toBe("bytes */16");
  });

  it("ignores an unparseable Range header and serves the full body (RFC 7233)", async () => {
    for (const bad of ["bytes=abc-def", "bytes=-", "items=0-5"]) {
      const res = await call("d1-100.pmtiles", bad);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(CONTENT);
    }
  });

  it("serves an empty archive without crashing", async () => {
    await writeFile(path.join(dir, "empty-1.pmtiles"), "");

    const full = await call("empty-1.pmtiles");
    expect(full.status).toBe(200);
    expect(full.headers.get("content-length")).toBe("0");
    expect(await full.text()).toBe("");

    const ranged = await call("empty-1.pmtiles", "bytes=0-5");
    expect(ranged.status).toBe(416);
    expect(ranged.headers.get("content-range")).toBe("bytes */0");
  });

  it("rejects names outside the archive charset", async () => {
    expect((await call("nope.txt")).status).toBe(400);
    expect((await call("%2e%2e%2fsecret.pmtiles")).status).toBe(400);
  });

  it("404s for a missing archive", async () => {
    expect((await call("ghost-1.pmtiles")).status).toBe(404);
  });
});
