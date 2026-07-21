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

/**
 * Navbar Tests
 *
 * Tests navbar rendering for authenticated/unauthenticated states and the
 * search-to-navigation E2E flow.
 *
 * Component-behavior tests (debounce, min-chars, escape, click-outside, arrow
 * keys) are better suited to Storybook interaction tests on search-input.
 */

test.describe("Navbar", () => {
  test("shows correct content for unauthenticated users", async ({ page }) => {
    // Ensure no authentication
    await page.context().clearCookies();
    await page.goto(getLocalizedPath("/"));

    // Should show "Sign In" for unauthenticated users (in navbar)
    await expect(page.getByTestId("navbar-sign-in")).toBeVisible();

    // Search input is visible for all users (public discovery feature)
    const searchInput = page.getByTestId("nav-search-input");
    await expect(searchInput).toBeVisible();
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
      const searchInput = page.getByTestId("nav-search-input");
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute("role", "combobox");
    } finally {
      // Clean up test user
      await cleanupTestUser(user.id);
    }
  });

  test.describe("Search navigation for authenticated users", () => {
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
  });
});
