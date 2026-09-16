import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import parisRaw from "./fixtures/nominatim-search-paris.json";
import saoPauloRaw from "./fixtures/nominatim-search-sao-paulo.json";
import osascoRaw from "./fixtures/nominatim-search-osasco.json";
import mexicoRaw from "./fixtures/nominatim-search-mexico.json";

type Search = typeof import("@/lib/nominatim-search").searchAreasWithNominatim;
let searchAreasWithNominatim: Search;

function stubFetch(body: unknown) {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify(body), { status: 200 })
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("searchAreasWithNominatim", () => {
  beforeEach(async () => {
    // The helper refuses external calls under NODE_ENV=test; fetch is stubbed.
    vi.stubEnv("NODE_ENV", "development");
    // Fresh module per test so the request throttle starts idle.
    vi.resetModules();
    ({ searchAreasWithNominatim } = await import("@/lib/nominatim-search"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests extratags and the locale, without unused params", async () => {
    const fetchMock = stubFetch([]);
    await searchAreasWithNominatim("Paris", "pt-BR");

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("q")).toBe("Paris");
    expect(url.searchParams.get("extratags")).toBe("1");
    expect(url.searchParams.get("addressdetails")).toBe("1");
    expect(url.searchParams.get("accept-language")).toBe("pt-BR");
    expect(url.searchParams.has("polygon_geojson")).toBe(false);
    expect(url.searchParams.has("osm_type")).toBe(false);
  });

  it("collapses boundaries that are the same place", async () => {
    stubFetch(parisRaw);
    expect((await searchAreasWithNominatim("Paris")).map((r) => r.osm_id)).toEqual([7444]);

    stubFetch(osascoRaw);
    vi.useFakeTimers();
    const pending = searchAreasWithNominatim("Osasco");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).map((r) => r.osm_id)).toEqual([43713, 298470]);
  });

  it("ranks cities before countries", async () => {
    stubFetch(mexicoRaw);
    const results = await searchAreasWithNominatim("mexico");
    expect(results.map((r) => r.osm_id)).toEqual([17483459, 114686]);
  });

  it("drops non-relation results", async () => {
    stubFetch(saoPauloRaw);
    const results = await searchAreasWithNominatim("São Paulo");
    expect(results.map((r) => r.osm_id)).toEqual([298285, 298204]);
  });

  it("does not call Nominatim for fewer than 3 characters", async () => {
    const fetchMock = stubFetch([]);
    expect(await searchAreasWithNominatim("Pa")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("spaces requests at least one second apart", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch([]);

    const first = searchAreasWithNominatim("Par");
    const second = searchAreasWithNominatim("Pari");
    const third = searchAreasWithNominatim("Paris");

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await Promise.all([first, second, third]);
  });

  it("skips a queued search whose query was superseded", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch([]);
    const controller = new AbortController();

    const first = searchAreasWithNominatim("Par");
    const stale = searchAreasWithNominatim(
      "Pari",
      "en",
      controller.signal
    ).catch((error: unknown) => error);
    controller.abort();

    await vi.advanceTimersByTimeAsync(1000);
    await first;
    expect(await stale).toHaveProperty("name", "AbortError");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("releases a superseded search's slot for the next search", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch([]);
    const controller = new AbortController();

    const first = searchAreasWithNominatim("Par");
    let staleSettled = false;
    const stale = searchAreasWithNominatim("Pari", "en", controller.signal)
      .catch((error: unknown) => error)
      .finally(() => {
        staleSettled = true;
      });

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    // Rejects on abort, not after its slot would have opened.
    expect(staleSettled).toBe(true);

    const latest = searchAreasWithNominatim("Paris");
    await vi.advanceTimersByTimeAsync(899);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Takes the freed slot at 1000ms instead of queueing behind it at 2000ms.
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await Promise.all([first, stale, latest]);
  });
});
