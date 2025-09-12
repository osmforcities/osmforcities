// Global mocks for external API calls in tests
import { Page, Route } from "@playwright/test";

// Mock Nominatim search response
export const mockNominatimSearchResponse = [
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
      type: "city",
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
      type: "city",
    },
  },
];

// Mock Nominatim lookup response
export const mockNominatimLookupResponse = [
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
      type: "city",
    },
    extratags: {
      population: "12396372",
      "ISO3166-2": "BR-SP",
    },
  },
];

// Mock Overpass API response
export const mockOverpassResponse = {
  version: 0.6,
  generator: "Overpass API 0.7.61.8 4b0a5c39",
  osm3s: {
    timestamp_osm_base: "2024-01-01T00:00:00Z",
    copyright:
      "The data included in this document is from www.openstreetmap.org.",
  },
  elements: [
    {
      type: "relation",
      id: 54321,
      bounds: {
        minlat: -23.8,
        minlon: -46.8,
        maxlat: -23.3,
        maxlon: -46.1,
      },
      members: [],
      tags: {
        name: "São Paulo",
        "name:en": "São Paulo",
        "name:pt": "São Paulo",
        type: "boundary",
        boundary: "administrative",
        admin_level: "8",
        population: "12396372",
        "ISO3166-2": "BR-SP",
        wikidata: "Q174",
        wikipedia: "pt:São Paulo",
      },
    },
  ],
};

// Mock empty search response
export const mockEmptySearchResponse: unknown[] = [];

// Mock error response
export const mockErrorResponse = {
  error: "Internal Server Error",
  message: "Something went wrong",
};

// Setup global mocks for all external API calls
export function setupGlobalApiMocks(page: Page) {
  // Mock Nominatim search API
  page.route("**/nominatim.openstreetmap.org/search*", async (route: Route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q");

    if (query?.includes("são") || query?.includes("sao")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNominatimSearchResponse),
      });
    } else if (query?.includes("xyz") || query?.includes("nonexistent")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockEmptySearchResponse),
      });
    } else if (query?.includes("error")) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify(mockErrorResponse),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNominatimSearchResponse),
      });
    }
  });

  // Mock Nominatim lookup API
  page.route("**/nominatim.openstreetmap.org/lookup*", async (route: Route) => {
    const url = new URL(route.request().url());
    const osmIds = url.searchParams.get("osm_ids");

    if (osmIds?.includes("R54321")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNominatimLookupResponse),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });

  // Mock Overpass API
  page.route("**/overpass-api.de/api/interpreter*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockOverpassResponse),
    });
  });

  // Mock map tiles
  page.route("**/tiles.openfreemap.org/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // Block any other external requests
  page.route("**/https://**", async (route: Route) => {
    console.warn(`🚫 Blocked external request to: ${route.request().url()}`);
    await route.abort("blockedbyclient");
  });
}

// Safeguard function to prevent accidental external calls
export function preventExternalCallsInTests() {
  if (process.env.NODE_ENV === "test") {
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (
        url.startsWith("http://localhost") ||
        url.startsWith("http://127.0.0.1")
      ) {
        return originalFetch(input, init);
      }

      console.error(`🚫 External API call blocked in test mode: ${url}`);
      throw new Error(
        `External API calls are not allowed in test mode. Attempted to call: ${url}`
      );
    };
  }
}
