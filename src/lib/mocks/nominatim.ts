import {
  NominatimSearchResponseSchema,
  type NominatimResult,
} from "@/schemas/nominatim";
// Real Nominatim response: Paris commune and département share wikidata Q90.
import parisSearchResponse from "@/lib/__tests__/fixtures/nominatim-search-paris.json";

const saoPauloSearchResponse: NominatimResult[] = [
  {
    place_id: 123456,
    osm_type: "relation",
    osm_id: 54321,
    display_name: "São Paulo, State of São Paulo, Brazil",
    name: "São Paulo",
    class: "place",
    type: "city",
    boundingbox: ["-23.8", "-23.3", "-46.8", "-46.1"],
    lat: "-23.5",
    lon: "-46.6",
    address: {
      country_code: "br",
      country: "Brazil",
      state: "State of São Paulo",
    },
  },
  {
    place_id: 789012,
    osm_type: "relation",
    osm_id: 67890,
    display_name: "São Paulo, São Paulo, Brazil",
    name: "São Paulo",
    class: "place",
    type: "city",
    boundingbox: ["-23.8", "-23.3", "-46.8", "-46.1"],
    lat: "-23.5",
    lon: "-46.6",
    address: {
      country_code: "br",
      country: "Brazil",
      state: "São Paulo",
    },
  },
];

const serverErrorResponse = {
  error: "Internal Server Error",
  message: "Something went wrong",
};

const lookupAreasByOsmId: Record<string, NominatimResult> = {
  R54321: {
    ...saoPauloSearchResponse[0],
    extratags: { population: "12396372", "ISO3166-2": "BR-SP" },
  },
  R298470: {
    place_id: 298470,
    osm_type: "relation",
    osm_id: 298470,
    display_name: "San Francisco, California, United States",
    name: "San Francisco",
    class: "boundary",
    type: "administrative",
    addresstype: "city",
    boundingbox: ["37.6403143", "37.9298443", "-123.1738249", "-122.2817799"],
    lat: "37.7792588",
    lon: "-122.4193286",
    address: {
      city: "San Francisco",
      state: "California",
      country: "United States",
      country_code: "us",
    },
    extratags: { admin_level: "8", wikidata: "Q62" },
  },
  R271110: {
    place_id: 271110,
    osm_type: "relation",
    osm_id: 271110,
    display_name: "Amsterdam, North Holland, Netherlands",
    name: "Amsterdam",
    class: "boundary",
    type: "administrative",
    addresstype: "city",
    boundingbox: ["52.2781742", "52.4310638", "4.7287563", "5.0791622"],
    lat: "52.3730796",
    lon: "4.8924534",
    address: {
      city: "Amsterdam",
      state: "North Holland",
      country: "Netherlands",
      country_code: "nl",
    },
    extratags: { admin_level: "8", wikidata: "Q727" },
  },
  R7444: NominatimSearchResponseSchema.parse(parisSearchResponse)[0],
};

export type MockNominatimResponse = { status: number; body: unknown };

export function mockNominatimSearch(query: string): MockNominatimResponse {
  const q = query.toLowerCase();
  if (q.includes("paris")) return { status: 200, body: parisSearchResponse };
  if (q.includes("xyz") || q.includes("nonexistent")) {
    return { status: 200, body: [] };
  }
  if (q.includes("error")) return { status: 500, body: serverErrorResponse };
  return { status: 200, body: saoPauloSearchResponse };
}

export function mockNominatimLookup(osmIds: string): MockNominatimResponse {
  const body = osmIds
    .split(",")
    .map((id) => lookupAreasByOsmId[id])
    .filter(Boolean);
  return { status: 200, body };
}
