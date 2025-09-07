import { test, expect } from "@playwright/test";
import { getLocalizedPath } from "./config";

const mockNominatimResponse = [
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
      type: "city",
    },
  },
  {
    place_id: 789012,
    osm_type: "relation",
    osm_id: 98765,
    display_name: "São José dos Campos, State of São Paulo, Brazil",
    name: "São José dos Campos",
    class: "place",
    type: "city",
    boundingbox: ["-23.3", "-22.9", "-45.9", "-45.8"],
    lat: "-23.2",
    lon: "-45.9",
    address: {
      country_code: "br",
      country: "Brazil",
      type: "city",
    },
  },
];

test.describe("NavSearch with Fixed Options", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Nominatim API
    await page.route(
      "https://nominatim.openstreetmap.org/search*",
      async (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get("q");

        if (query && query.includes("são")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockNominatimResponse),
          });
        } else if (query && query.length >= 3) {
          // Return empty results for other valid queries
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.continue();
        }
      }
    );
  });

  test("should show search results for fixed options", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await expect(page.getByRole("option")).toHaveCount(2);
    await expect(page.getByRole("option").first()).toContainText("São Paulo");
    await expect(page.getByRole("option").last()).toContainText(
      "São José dos Campos"
    );
  });

  test("should navigate through results with arrow keys", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").last()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("ArrowUp");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );
  });

  test("should navigate to area page when pressing Enter on selected item", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("Enter");

    // Wait for navigation to complete
    await page.waitForURL(getLocalizedPath("/area/54321"));
    await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
  });

  test("should navigate to area page when clicking on result", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.getByRole("option").first().click();

    // Wait for navigation to complete
    await page.waitForURL(getLocalizedPath("/area/54321"));
    await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
  });

  test("should close dropdown when pressing Escape", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("Escape");

    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(searchInput).toHaveValue("");
  });
});
