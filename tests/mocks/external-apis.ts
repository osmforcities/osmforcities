import { Page, Route } from "@playwright/test";
import {
  mockNominatimLookup,
  mockNominatimSearch,
  type MockNominatimResponse,
} from "../../src/lib/mocks/nominatim";

const fulfill = (route: Route, { status, body }: MockNominatimResponse) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

// The nav search calls Nominatim from the browser, which the server's
// NOMINATIM_API_URL does not reach
export function setupGlobalApiMocks(page: Page) {
  page.route("**/nominatim.openstreetmap.org/search*", (route: Route) => {
    const url = new URL(route.request().url());
    return fulfill(route, mockNominatimSearch(url.searchParams.get("q") ?? ""));
  });

  page.route("**/nominatim.openstreetmap.org/lookup*", (route: Route) => {
    const url = new URL(route.request().url());
    return fulfill(
      route,
      mockNominatimLookup(url.searchParams.get("osm_ids") ?? "")
    );
  });

  page.route("**/tiles.openfreemap.org/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    })
  );
}
