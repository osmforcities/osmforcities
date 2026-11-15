import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { NominatimSearchResponseSchema } from "@/schemas/nominatim";

const get = (path: string[], query: string) =>
  GET(
    new NextRequest(
      `http://localhost/api/mock-nominatim/${path.join("/")}?${query}`
    ),
    { params: Promise.resolve({ path }) }
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/mock-nominatim", () => {
  it("answers 404 when test auth is off", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "false");
    expect((await get(["lookup"], "osm_ids=R271110")).status).toBe(404);
    expect((await get(["search"], "q=paris")).status).toBe(404);
  });

  describe("with test auth on", () => {
    it("looks up the requested relations, skipping unknown ones", async () => {
      vi.stubEnv("ENABLE_TEST_AUTH", "true");
      const response = await get(["lookup"], "osm_ids=R271110,R1,R298470");
      expect(response.status).toBe(200);
      const areas = NominatimSearchResponseSchema.parse(await response.json());
      expect(areas.map((area) => [area.osm_id, area.name])).toEqual([
        [271110, "Amsterdam"],
        [298470, "San Francisco"],
      ]);
    });

    it("searches by term", async () => {
      vi.stubEnv("ENABLE_TEST_AUTH", "true");
      const paris = NominatimSearchResponseSchema.parse(
        await (await get(["search"], "q=Paris")).json()
      );
      expect(paris.map((area) => area.osm_id)).toContain(7444);
    });

    it("finds nothing for an unknown term", async () => {
      vi.stubEnv("ENABLE_TEST_AUTH", "true");
      expect(await (await get(["search"], "q=nonexistent")).json()).toEqual([]);
    });

    it("fails for the error term", async () => {
      vi.stubEnv("ENABLE_TEST_AUTH", "true");
      expect((await get(["search"], "q=error")).status).toBe(500);
    });

    it("answers 404 for other endpoints", async () => {
      vi.stubEnv("ENABLE_TEST_AUTH", "true");
      expect((await get(["reverse"], "lat=0&lon=0")).status).toBe(404);
    });
  });
});
