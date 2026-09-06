import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  tilerEnabled,
  newTileJobId,
  getTileJob,
  submitTilesColumns,
  pruneTileArchives,
} from "@/lib/tiler/client";

beforeEach(() => {
  vi.stubEnv("TILER_URL", "http://127.0.0.1:8099");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("tilerEnabled", () => {
  it("is off when TILER_URL is unset", () => {
    vi.stubEnv("TILER_URL", "");
    expect(tilerEnabled()).toBe(false);
  });

  it("is on when TILER_URL is set", () => {
    expect(tilerEnabled()).toBe(true);
  });
});

describe("newTileJobId", () => {
  it("is datasetId plus epoch seconds, within the tiler's id charset", () => {
    const id = newTileJobId("cmabc123");
    expect(id).toMatch(/^cmabc123-\d{10}$/);
    expect(id).toMatch(/^[A-Za-z0-9._-]{1,128}$/);
  });
});

describe("getTileJob", () => {
  it("returns the job record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "d1-1", state: "done" }),
      } as unknown as Response)
    );
    expect(await getTileJob("d1-1")).toEqual({ id: "d1-1", state: "done" });
  });

  it("returns null on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response)
    );
    expect(await getTileJob("d1-1")).toBeNull();
  });

  it("throws on other errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
    );
    await expect(getTileJob("d1-1")).rejects.toThrow("500");
  });

  it("fails fast with a clear error when TILER_URL is unset", async () => {
    vi.stubEnv("TILER_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getTileJob("d1-1")).rejects.toThrow("TILER_URL is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("submitTilesColumns", () => {
  it("returns pending columns on a 202 submit", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 202 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const columns = await submitTilesColumns("d1", "[out:json];...", ["name"]);
    expect(columns.tilesState).toBe("pending");
    expect(columns.tilesJobId).toMatch(/^d1-\d+$/);
    expect(columns.tilesError).toBeNull();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.id).toBe(columns.tilesJobId);
    expect(body.query).toBe("[out:json];...");
    expect(body.filterableTags).toEqual(["name"]);
  });

  it("returns empty columns when the tiler is disabled", async () => {
    vi.stubEnv("TILER_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await submitTilesColumns("d1", "q", [])).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws — an outage becomes failed columns", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const columns = await submitTilesColumns("d1", "q", []);
    expect(columns.tilesState).toBe("failed");
    expect(columns.tilesError).toContain("ECONNREFUSED");
    expect(columns.tilesJobId).toBeUndefined();
  });
});

describe("pruneTileArchives", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "tiles-test-"));
    vi.stubEnv("TILES_DIR", dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps the two newest archives per dataset, deletes the rest", async () => {
    for (const epoch of [100, 200, 300]) {
      await writeFile(path.join(dir, `d1-${epoch}.pmtiles`), "x");
      await writeFile(path.join(dir, `d1-${epoch}.stats.json`), "{}");
    }
    await writeFile(path.join(dir, "other-50.pmtiles"), "x");

    await pruneTileArchives("d1");

    const names = (await readdir(dir)).sort();
    expect(names).toEqual([
      "d1-200.pmtiles",
      "d1-200.stats.json",
      "d1-300.pmtiles",
      "d1-300.stats.json",
      "other-50.pmtiles",
    ]);
  });

  it("is a no-op when the tiles dir does not exist", async () => {
    vi.stubEnv("TILES_DIR", path.join(dir, "missing"));
    await expect(pruneTileArchives("d1")).resolves.toBeUndefined();
  });
});
