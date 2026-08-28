import { describe, it, expect, vi, afterEach } from "vitest";

// map-tiles reads env at module load, so each case needs a fresh import
async function cartoUrls(key?: string) {
  vi.resetModules();
  if (key) process.env.NEXT_PUBLIC_MAP_TILE_KEY = key;
  else delete process.env.NEXT_PUBLIC_MAP_TILE_KEY;
  const { mapStyle } = await import("../map-tiles");
  const source = mapStyle.sources.tiles;
  return "tiles" in source && source.tiles ? source.tiles : [];
}

describe("cartodb tile URLs", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("carries the key on every subdomain when set", async () => {
    const urls = await cartoUrls("test_key_123");
    expect(urls).toHaveLength(4);
    for (const url of urls) expect(url).toContain("?key=test_key_123");
  });

  // Without the ternary this emits "?key=undefined", which CARTO rejects —
  // the watermark returns behind a URL that looks correct
  it("emits no query string when unset", async () => {
    for (const url of await cartoUrls()) expect(url).not.toContain("?");
  });
});
