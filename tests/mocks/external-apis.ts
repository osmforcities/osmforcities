import { Page, Route } from "@playwright/test";

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

export { mockOverpassResponse } from "../../src/lib/mocks/overpass";

export const mockEmptySearchResponse: unknown[] = [];

export const mockErrorResponse = {
  error: "Internal Server Error",
  message: "Something went wrong",
};

export function setupGlobalApiMocks(page: Page) {
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

  page.route("**/tiles.openfreemap.org/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  page.route("**/https://**", async (route: Route) => {
    console.warn(`🚫 Blocked external request to: ${route.request().url()}`);
    await route.abort("blockedbyclient");
  });
}

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
