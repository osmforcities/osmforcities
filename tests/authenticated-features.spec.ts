import { test, expect } from "@playwright/test";
import { setupAuthenticationWithSignup, cleanupTestUser } from "./utils/auth";
import { getLocalizedPath } from "./config";

/**
 * Authenticated Features Tests
 *
 * Tests that features work correctly for authenticated users.
 */

test.describe("Authenticated Features", () => {
  test("authenticated user should see search input on homepage", async ({
    page,
  }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `search-test-${Date.now()}@example.com`,
    });

    try {
      // Navigate to homepage
      await page.goto(getLocalizedPath("/"));

      // Wait for the page to load completely
      await page.waitForLoadState("domcontentloaded");

      // Search input should be visible for authenticated users
      const searchInput = page.getByPlaceholder("Search cities and areas...");
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute("role", "combobox");

      // Sign in button should NOT be visible (should show user menu instead)
      const signInButton = page.getByText("Sign In");
      await expect(signInButton).toBeHidden();
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("authenticated user can access protected routes", async ({ page }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `protected-routes-${Date.now()}@example.com`,
      isAdmin: false,
    });

    try {
      // Test protected routes
      const protectedRoutes = ["/watched", "/my-datasets", "/preferences"];

      for (const route of protectedRoutes) {
        await page.goto(getLocalizedPath(route));
        // Should stay on the requested route, not redirect to login
        await expect(page).toHaveURL(getLocalizedPath(route));
      }
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("search functionality works for authenticated users", async ({
    page,
  }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `search-functionality-${Date.now()}@example.com`,
    });

    try {
      // Mock the Nominatim API
      await page.route(
        "https://nominatim.openstreetmap.org/search*",
        async (route) => {
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
              },
            ]),
          });
        }
      );

      await page.goto(getLocalizedPath("/"));

      const searchInput = page.getByPlaceholder("Search cities and areas...");
      await searchInput.fill("são paulo");

      // Should show dropdown with results
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByText("São Paulo")).toBeVisible();
    } finally {
      await cleanupTestUser(user.id);
    }
  });
});
