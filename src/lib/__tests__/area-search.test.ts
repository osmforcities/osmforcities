import { describe, it, expect } from "vitest";
import {
  dedupeAreas,
  parsePopulation,
  rankByScale,
  toAreaSearchResult,
} from "@/lib/area-search";
import {
  NominatimSearchResponseSchema,
  type NominatimResult,
} from "@/schemas/nominatim";
import parisRaw from "./fixtures/nominatim-search-paris.json";
import saoPauloRaw from "./fixtures/nominatim-search-sao-paulo.json";
import rioRaw from "./fixtures/nominatim-search-rio.json";
import tokyoRaw from "./fixtures/nominatim-search-tokyo.json";
import osascoRaw from "./fixtures/nominatim-search-osasco.json";
import mexicoRaw from "./fixtures/nominatim-search-mexico.json";
import londonRaw from "./fixtures/nominatim-search-london.json";

// Trimmed real Nominatim /search responses (accept-language=en, extratags=1).
const paris = NominatimSearchResponseSchema.parse(parisRaw);
const osasco = NominatimSearchResponseSchema.parse(osascoRaw);
const mexico = NominatimSearchResponseSchema.parse(mexicoRaw);
const london = NominatimSearchResponseSchema.parse(londonRaw);
const saoPaulo = NominatimSearchResponseSchema.parse(saoPauloRaw);
const rio = NominatimSearchResponseSchema.parse(rioRaw);
const tokyo = NominatimSearchResponseSchema.parse(tokyoRaw);

const ids = (results: NominatimResult[]) => results.map((r) => r.osm_id);

describe("dedupeAreas", () => {
  it("keeps the most local admin level when importance is tied (Paris)", () => {
    expect(ids(dedupeAreas(paris))).toEqual([7444]);
  });

  it("does not depend on Nominatim's order when importance is tied", () => {
    expect(ids(dedupeAreas([...paris].reverse()))).toEqual([7444]);
  });

  it("collapses a same-name, same-bbox district without wikidata (Osasco)", () => {
    // The IBGE seat district has the municipality's exact outline but no
    // wikidata; the municipality wins on importance, not admin level.
    expect(ids(dedupeAreas(osasco))).toEqual([43713, 298470]);
    expect(ids(dedupeAreas([...osasco].reverse()))).toEqual([298470, 43713]);
  });

  it("keeps same-named areas with different outlines and wikidata", () => {
    const [city, , state] = saoPaulo;
    expect(ids(dedupeAreas([city, state]))).toEqual([298285, 298204]);
  });

  it("passes unrelated results without wikidata through, preserving order", () => {
    const noWikidata = { ...tokyo[0], osm_id: 1, extratags: undefined };
    const other = { ...rio[0], osm_id: 2, extratags: {} };
    expect(ids(dedupeAreas([noWikidata, ...paris, other]))).toEqual([
      1, 7444, 2,
    ]);
  });

  it("keeps the first result on a full tie", () => {
    const a = { ...paris[0], osm_id: 10, extratags: { wikidata: "Q1" } };
    const b = { ...paris[1], osm_id: 11, extratags: { wikidata: "Q1" } };
    expect(ids(dedupeAreas([a, b]))).toEqual([10]);
  });

  it("merges a chain of matches regardless of order", () => {
    // B matches A by name + bbox, C matches A by wikidata, B and C share
    // nothing. Paris has this shape: arrondissement, département, commune.
    const [commune, departement] = paris;
    const district = {
      ...commune,
      osm_id: 1,
      importance: 0.1,
      extratags: { admin_level: "9" },
    };
    const region = {
      ...departement,
      boundingbox: ["48.0", "49.0", "2.0", "3.0"],
    };
    for (const order of [
      [district, region, commune],
      [region, district, commune],
      [commune, district, region],
    ]) {
      expect(ids(dedupeAreas(order))).toEqual([7444]);
    }
  });

  it("puts the kept result at the group's first position", () => {
    const [commune, departement] = paris;
    expect(ids(dedupeAreas([departement, rio[0], commune]))).toEqual([
      7444, 2697338,
    ]);
  });
});

describe("rankByScale", () => {
  it("puts cities before states and countries (Mexico)", () => {
    expect(ids(rankByScale(dedupeAreas(mexico)))).toEqual([17483459, 114686]);
  });

  it("orders city, state, country when all are present", () => {
    expect(ids(rankByScale(mexico))).toEqual([17483459, 1376330, 114686]);
  });

  it("keeps Nominatim's order within the city scale (London)", () => {
    // Pure local-first would put City of London above Greater London.
    expect(ids(rankByScale(london))).toEqual([175342, 51800, 7485368]);
  });

  it("puts a state after its same-named city (São Paulo)", () => {
    const [city, , state] = saoPaulo;
    expect(ids(rankByScale([state, city]))).toEqual([298285, 298204]);
  });

  it("treats a missing place_rank as city scale", () => {
    const unranked = { ...tokyo[0], osm_id: 1, place_rank: undefined };
    expect(ids(rankByScale([mexico[0], unranked]))).toEqual([1, 114686]);
  });
});

describe("toAreaSearchResult", () => {
  it("drops the component that is the area itself, keeps same-named parents", () => {
    const [city, , state] = saoPaulo;
    expect(toAreaSearchResult(city).parents).toEqual(["São Paulo", "Brazil"]);
    expect(toAreaSearchResult(state).parents).toEqual(["Brazil"]);
  });

  it("builds the parent chain from state and country", () => {
    expect(toAreaSearchResult(paris[0]).parents).toEqual([
      "Ile-de-France",
      "France",
    ]);
    expect(toAreaSearchResult(tokyo[0]).parents).toEqual(["Japan"]);
  });

  it("handles a result without address", () => {
    expect(
      toAreaSearchResult({ ...tokyo[0], address: undefined }).parents
    ).toEqual([]);
  });

  it("reads population when tagged, null when not", () => {
    expect(toAreaSearchResult(saoPaulo[0]).population).toBe(11451999);
    expect(toAreaSearchResult(rio[1]).population).toBeNull();
  });

  it("labels an area as city when it is its own address city", () => {
    // Nominatim demotes the Paris commune to "suburb" because the place node
    // is linked to the département.
    expect(toAreaSearchResult(paris[0]).addresstype).toBe("city");
    expect(toAreaSearchResult(saoPaulo[2]).addresstype).toBe("state");
  });
});

describe("parsePopulation", () => {
  it("parses plain integers", () => {
    expect(parsePopulation("2133111")).toBe(2133111);
    expect(parsePopulation(" 42 ")).toBe(42);
  });

  it("rejects missing, non-numeric and multi-value tags", () => {
    expect(parsePopulation(undefined)).toBeNull();
    expect(parsePopulation("")).toBeNull();
    expect(parsePopulation("about 5000")).toBeNull();
    expect(parsePopulation("1,234")).toBeNull();
    expect(parsePopulation("100;200")).toBeNull();
    expect(parsePopulation("0")).toBeNull();
  });
});
