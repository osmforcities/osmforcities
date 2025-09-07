import { test, expect } from "@playwright/test";
import { getLocalizedPath } from "./config";
import { setupAuthenticationWithSignup, cleanupTestUser, TestUser } from "./utils/auth";

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
      state: "State of São Paulo",
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
      state: "State of São Paulo",
      type: "city",
    },
  },
];

/**
 * Navbar Tests
 *
 * Tests navbar functionality for both authenticated and unauthenticated states.
 * Includes comprehensive search functionality testing for authenticated users.
 */

test.describe("Navbar", () => {
  test("shows correct content for unauthenticated users", async ({ page }) => {
    // Ensure no authentication
    await page.context().clearCookies();
    await page.goto(getLocalizedPath("/"));

    // Should show "Sign In" for unauthenticated users
    await expect(page.getByText("Sign In")).toBeVisible();

    // Search input should be hidden for unauthenticated users
    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await expect(searchInput).toBeHidden();
  });

  test("shows correct content for authenticated users", async ({ page }) => {
    // Set up authentication
    const user = await setupAuthenticationWithSignup(page, {
      email: `navbar-test-${Date.now()}@example.com`,
      name: "Navbar Test User",
    });

    try {
      // Should show authenticated user actions instead of "Sign In"
      await expect(page.getByText("Sign Out")).toBeVisible();

      // Search input should be visible for authenticated users
      const searchInput = page.getByPlaceholder("Search cities and areas...");
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute("role", "combobox");
    } finally {
      // Clean up test user
      await cleanupTestUser(user.id);
    }
  });

  test.describe("Search functionality for authenticated users", () => {
    let testUser: TestUser;

    test.beforeEach(async ({ page }) => {
      // Set up authentication with unique email for each test
      const uniqueId = Date.now() + Math.random();
      testUser = await setupAuthenticationWithSignup(page, {
        email: `search-test-${uniqueId}@example.com`,
        name: "Search Test User",
      });

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

    test.afterEach(async () => {
      if (testUser) {
        await cleanupTestUser(testUser.id);
      }
    });

    test("should not show dropdown for queries less than 3 characters", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("sa");
      await page.waitForTimeout(600); // Wait for debounce

      // Should not show any results
      await expect(page.getByRole("listbox")).toBeHidden();
    });

    test("should show loading state during search", async ({ page }) => {
      // Mock API with delay to ensure loading state is visible
      await page.route(
        "https://nominatim.openstreetmap.org/search*",
        async (route) => {
          // Add delay to see loading state
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const url = new URL(route.request().url());
          const query = url.searchParams.get("q");

          if (query && query.includes("são")) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockNominatimResponse),
            });
          } else {
            await route.continue();
          }
        }
      );

      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600); // Wait for debounce and API call to start

      // Should show loading spinner
      await expect(page.locator(".animate-spin")).toBeVisible();
    });

    test("should show search results for valid query", async ({ page }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600); // Wait for debounce and API response

      // Should show dropdown with results
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByRole("option")).toHaveCount(2);

      // Check result content
      await expect(page.getByRole("option").first()).toContainText("São Paulo");
      await expect(page.getByRole("option").first()).toContainText(
        "State of São Paulo, Brazil"
      );
      await expect(page.getByRole("option").first()).toContainText("City");
      await expect(page.getByRole("option").first()).toContainText("ID: 54321");

      await expect(page.getByRole("option").last()).toContainText(
        "São José dos Campos"
      );
      await expect(page.getByRole("option").last()).toContainText(
        "State of São Paulo, Brazil"
      );
      await expect(page.getByRole("option").last()).toContainText("City");
      await expect(page.getByRole("option").last()).toContainText("ID: 98765");
    });

    test("should show no results message for empty response", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("xyz");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByText("No areas found")).toBeVisible();
    });

    test("should navigate through results with arrow keys", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();

      // Press down arrow to focus first item
      await searchInput.press("ArrowDown");
      await expect(page.getByRole("option").first()).toHaveAttribute(
        "data-focused",
        "true"
      );

      // Press down arrow again to focus second item
      await searchInput.press("ArrowDown");
      await expect(page.getByRole("option").last()).toHaveAttribute(
        "data-focused",
        "true"
      );

      // Press up arrow to go back to first item
      await searchInput.press("ArrowUp");
      await expect(page.getByRole("option").first()).toHaveAttribute(
        "data-focused",
        "true"
      );
    });

    test("should navigate to area page when pressing Enter on selected item", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();

      // Focus first item with arrow key
      await searchInput.press("ArrowDown");
      await expect(page.getByRole("option").first()).toHaveAttribute(
        "data-focused",
        "true"
      );

      // Press Enter to navigate
      await searchInput.press("Enter");

      // Should navigate to the area page
      await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
    });

    test("should navigate to area page when clicking on result", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();

      // Click on first result
      await page.getByRole("option").first().click();

      // Should navigate to the area page
      await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
    });

    test("should close dropdown and clear search when pressing Escape", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();

      // Press Escape
      await searchInput.press("Escape");

      // Dropdown should be hidden and input should be cleared
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(searchInput).toHaveValue("");
    });

    test("should close dropdown when clicking outside", async ({ page }) => {
      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("são");
      await page.waitForTimeout(600);

      await expect(page.getByRole("listbox")).toBeVisible();

      // Click outside the search component
      await page.locator("body").click();

      // Dropdown should be hidden and input should be cleared
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(searchInput).toHaveValue("");
    });

    test("should handle API errors gracefully", async ({ page }) => {
      // Mock API to return error
      await page.route(
        "https://nominatim.openstreetmap.org/search*",
        async (route) => {
          await route.fulfill({
            status: 500,
            body: "Internal Server Error",
          });
        }
      );

      const searchInput = page.getByPlaceholder("Search cities and areas...");

      await searchInput.fill("error");
      await page.waitForTimeout(600);

      // Should show no results (graceful fallback)
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByText("No areas found")).toBeVisible();
    });
  });
});
