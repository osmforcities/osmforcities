import { test, expect } from "@playwright/test";
import { getLocalizedPath } from "./config";
import {
  setupAuthenticationWithSignup,
  cleanupTestUser,
  TestUser,
} from "./utils/auth";

/**
 * Area Page Tests
 *
 * Tests the area page functionality including:
 * - Area page loads correctly with area information
 * - Datasets are displayed in a grid
 * - Navigation works properly (breadcrumbs, external links)
 * - Error handling for invalid area IDs
 */

test.describe("Area Page", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = await setupAuthenticationWithSignup(page);
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser.id);
  });

  test("should display area information and datasets", async ({ page }) => {
    // Mock Nominatim response for area details
    await page.route(
      "**/nominatim.openstreetmap.org/lookup*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              place_id: 123456,
              osm_type: "relation",
              osm_id: 298470,
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
          ]),
        });
      }
    );

    const areaId = "298470";

    // Navigate to area page
    await page.goto(getLocalizedPath(`/area/${areaId}`));
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load completely
    await expect(page.locator("h1")).toBeVisible();

    // Check that we're not on a 404 page
    await expect(page.locator("h1")).not.toContainText("404");

    // Check that area ID is displayed
    await expect(page.locator("text=ID: 298470")).toBeVisible();

    // Check that datasets section is displayed
    await expect(page.locator("text=Available Datasets")).toBeVisible();
    await expect(
      page.locator("text=Choose a dataset to explore data for this area")
    ).toBeVisible();

    // Check that template grid is present
    await expect(page.locator("[data-testid='template-grid']")).toBeVisible();

    // Check that OpenStreetMap link is present
    await expect(page.locator("a[href*='openstreetmap.org']")).toBeVisible();
  });

  test("should display clickable dataset cards", async ({ page }) => {
    // Mock Nominatim response
    await page.route(
      "**/nominatim.openstreetmap.org/lookup*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              place_id: 123456,
              osm_type: "relation",
              osm_id: 298470,
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
          ]),
        });
      }
    );

    const areaId = "298470";

    // Navigate to area page
    await page.goto(getLocalizedPath(`/area/${areaId}`));
    await page.waitForLoadState("domcontentloaded");

    // Wait for templates to load
    await expect(page.locator("[data-testid='template-grid']")).toBeVisible();

    // Check that dataset cards are present and clickable
    const datasetCards = page.locator("a[href*='/template/']");
    await expect(datasetCards.first()).toBeVisible();

    // Verify dataset links have correct structure
    const firstDatasetLink = datasetCards.first();
    const href = await firstDatasetLink.getAttribute("href");
    expect(href).toMatch(/\/area\/298470\/template\/[^\/]+$/);

    // Check that dataset cards have proper content
    await expect(firstDatasetLink.locator("h3")).toBeVisible(); // Dataset name
  });

  test("should handle invalid area ID gracefully", async ({ page }) => {
    // Navigate to invalid area page
    await page.goto(getLocalizedPath("/area/invalid"));

    // Should redirect to 404 or show error
    await expect(page.locator("text=404")).toBeVisible({ timeout: 10000 });
  });
});
