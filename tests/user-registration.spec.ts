import { test, expect } from "@playwright/test";
import { setupAuthenticationWithSignup, cleanupTestUser } from "./utils/auth";
import { getLocalizedPath } from "./config";

/**
 * User Registration and Authentication Tests
 *
 * Tests the complete signup/login workflow for Playwright testing.
 * This demonstrates how to create users and authenticate them for testing.
 */

test.describe("User Registration and Authentication", () => {
  test("should complete signup and login workflow", async ({ page }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `signup-test-${Date.now()}@example.com`,
      name: "Signup Test User",
      password: "test-password-123",
    });

    try {
      // Verify we're authenticated by checking the homepage
      await page.goto(getLocalizedPath("/"));
      await page.waitForLoadState("domcontentloaded");

      // Search input should be visible for authenticated users
      const searchInput = page.getByPlaceholder("Search cities and areas (min. 3 characters)...");
      await expect(searchInput).toBeVisible();

      // Sign in button should NOT be visible (should show user menu instead)
      const signInButton = page.getByText("Sign In");
      await expect(signInButton).toBeHidden();
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("should login with existing user credentials", async ({ page }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `login-test-${Date.now()}@example.com`,
      name: "Login Test User",
    });

    try {
      // Verify we're authenticated
      await page.goto(getLocalizedPath("/"));
      await page.waitForLoadState("domcontentloaded");

      const searchInput = page.getByPlaceholder("Search cities and areas (min. 3 characters)...");
      await expect(searchInput).toBeVisible();

      const signInButton = page.getByText("Sign In");
      await expect(signInButton).toBeHidden();
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("should access protected routes after authentication", async ({
    page,
  }) => {
    const user = await setupAuthenticationWithSignup(page, {
      email: `protected-routes-${Date.now()}@example.com`,
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
});
