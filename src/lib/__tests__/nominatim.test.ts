import { describe, it, expect, vi, afterEach } from "vitest";
import { getAreaDetailsById, nominatimApiUrl } from "@/lib/nominatim";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("nominatimApiUrl", () => {
  it("refuses a non-local Nominatim in test mode", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NOMINATIM_API_URL", "https://nominatim.example.org");
    expect(() => nominatimApiUrl()).toThrow(/not allowed in test mode/);
  });

  it("refuses the public default in test mode", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NOMINATIM_API_URL", "");
    expect(() => nominatimApiUrl()).toThrow(/not allowed in test mode/);
  });

  it("allows a local Nominatim in test mode", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NOMINATIM_API_URL", "http://localhost:3000/api/mock-nominatim");
    expect(nominatimApiUrl()).toBe("http://localhost:3000/api/mock-nominatim");
  });

  it("defaults to the public Nominatim outside test mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOMINATIM_API_URL", "");
    expect(nominatimApiUrl()).toBe("https://nominatim.openstreetmap.org");
  });
});

describe("getAreaDetailsById", () => {
  it("looks the relation up on NOMINATIM_API_URL", async () => {
    vi.stubEnv("NOMINATIM_API_URL", "http://localhost:3000/api/mock-nominatim");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);

    await getAreaDetailsById(271110);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      "http://localhost:3000/api/mock-nominatim/lookup"
    );
    expect(url.searchParams.get("osm_ids")).toBe("R271110");
  });
});
