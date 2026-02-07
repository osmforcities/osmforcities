import { test, expect } from "./test-setup";
import { getLocalizedPath } from "./config";
import {
  setupAuthenticationWithSignup,
  cleanupTestUser,
  TestUser,
} from "./utils/auth";

// Test timeouts
const SEARCH_DEBOUNCE_WAIT = 600; // Match component's 500ms debounce + buffer
const LISTBOX_TIMEOUT = 30000; // Debounce + API call + render
const LOADING_STATE_TIMEOUT = 2000;

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

    // Should show "Sign In" for unauthenticated users (in navbar)
    await expect(page.getByTestId("navbar-sign-in")).toBeVisible();

    // Search input should be hidden for unauthenticated users
    const searchInput = page.getByTestId("nav-search-input");
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
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );
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
      // Note: Nominatim API is mocked globally in test-setup.ts
    });

    test.afterEach(async () => {
      if (testUser) {
        await cleanupTestUser(testUser.id);
      }
    });

    test("should show helpful message for queries less than 3 characters", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("sa");

      // Should show helpful message about needing more characters
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(
        page.getByRole("option").getByText("Type 1 more character to search")
      ).toBeVisible();
    });

    test("should show loading state during search", async ({ page }) => {
      // Remove global mock and set up delayed response
      await page.unroute("**/nominatim.openstreetmap.org/search*");
      await page.route("**/nominatim.openstreetmap.org/search*", async (route) => {
        // Add delay to see loading state
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const url = new URL(route.request().url());
        const query = url.searchParams.get("q");

        if (query && query.includes("são")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
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
            ]),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        }
      });

      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("são");

      // Should show loading spinner
      await expect(page.locator(".animate-spin")).toBeVisible({
        timeout: LOADING_STATE_TIMEOUT,
      });

      // Re-install global mock for subsequent tests
      const { setupGlobalApiMocks } = await import("./mocks/external-apis");
      setupGlobalApiMocks(page);
    });

    test("should show search results for valid query", async ({ page }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("são");

      // Wait for API call to complete and listbox to appear
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });
      await expect(page.getByRole("option")).toHaveCount(2);

      // Check result content - both results are São Paulo (from global mock in external-apis.ts)
      await expect(page.getByRole("option").first()).toContainText("São Paulo");
      await expect(page.getByRole("option").first()).toContainText("State of São Paulo, Brazil");
      await expect(page.getByRole("option").first()).toContainText("City");
      await expect(page.getByRole("option").first()).toContainText("ID: 54321");

      await expect(page.getByRole("option").last()).toContainText("São Paulo");
      await expect(page.getByRole("option").last()).toContainText("São Paulo, Brazil");
      await expect(page.getByRole("option").last()).toContainText("City");
      await expect(page.getByRole("option").last()).toContainText("ID: 67890");
    });

    test("should show no results message for empty response", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("xyz");

      // Wait for API call to complete
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });
      await expect(page.getByText("No areas found")).toBeVisible();
    });

    test("should navigate through results with arrow keys", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("são");
      // Wait for debounced search (500ms)
      await page.waitForTimeout(SEARCH_DEBOUNCE_WAIT);

      // Wait for API call to complete and listbox to appear
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });

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
      const searchInput = page.getByTestId("nav-search-input");

      await searchInput.click();
      await searchInput.fill("são");

      // Wait for debounced search to complete and API call to finish
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });
      await expect(page.getByRole("option").first()).toBeVisible();

      // Wait a bit more to ensure debounced search has completed
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(SEARCH_DEBOUNCE_WAIT);

      // Focus first item with arrow key
      await searchInput.press("ArrowDown");
      await expect(page.getByRole("option").first()).toHaveAttribute(
        "data-focused",
        "true"
      );

      // Press Enter to navigate
      await searchInput.press("Enter");

      // Should navigate to the area page
      await expect(page).toHaveURL(getLocalizedPath("/area/54321"), {
        timeout: LISTBOX_TIMEOUT,
      });
    });

    test("should navigate to area page when clicking on result", async ({
      page,
    }) => {
      const searchInput = page.getByTestId("nav-search-input");

      await searchInput.click();
      await searchInput.fill("são");

      // Wait for debounced search to complete and API call to finish
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });
      await expect(page.getByRole("option").first()).toBeVisible();

      // Wait a bit more to ensure debounced search has completed
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(SEARCH_DEBOUNCE_WAIT);

      // Use keyboard navigation to select the item
      await searchInput.press("ArrowDown");
      await searchInput.press("Enter");

      // Should navigate to the area page
      await expect(page).toHaveURL(getLocalizedPath("/area/54321"), {
        timeout: LISTBOX_TIMEOUT,
      });
    });

    test("should close dropdown and clear search when pressing Escape", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("são");

      // Wait for API call to complete and listbox to appear
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });

      // Press Escape
      await searchInput.press("Escape");

      // Dropdown should be hidden and input should be cleared
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(searchInput).toHaveValue("");
    });

    test("should close dropdown when clicking outside", async ({ page }) => {
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("são");

      // Wait for API call to complete and listbox to appear
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });

      // Click outside the search component
      await page.locator("body").click();

      // Dropdown should be hidden and input should be cleared
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(searchInput).toHaveValue("");
    });

    test("should handle API errors gracefully", async ({ page }) => {
      // Global mock already handles "error" query with 500 response
      const searchInput = page.getByPlaceholder(
        "Search cities and areas (min. 3 characters)..."
      );

      await searchInput.click();
      await searchInput.fill("error");

      // Wait for API call to complete
      await expect(page.getByRole("listbox")).toBeVisible({
        timeout: LISTBOX_TIMEOUT,
      });
      await expect(page.getByText("No areas found")).toBeVisible();
    });
  });
});
