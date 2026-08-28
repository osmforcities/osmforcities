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

  it("carries the baked-in key by default", async () => {
    const urls = await cartoUrls();
    expect(urls).toHaveLength(4);
    for (const url of urls) expect(url).toMatch(/\?key=cb1_\w+$/);
  });

  it("lets the env var override the key", async () => {
    for (const url of await cartoUrls("override_key")) {
      expect(url).toContain("?key=override_key");
    }
  });
});
