import { test, expect } from "@playwright/test";
import { setupAuthenticationWithSignup, cleanupTestUser } from "./utils/auth";

test.describe("Route Protection", () => {
  test("should allow access to public routes without authentication", async ({ page }) => {
    // Test home page (root)
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/); // Should redirect to locale

    // Test about page
    await page.goto("/en/about");
    await expect(page).toHaveURL("/en/about");
    await expect(page.locator("h1")).toContainText("About");

    // Test login/signup pages
    await page.goto("/en/enter");
    await expect(page).toHaveURL("/en/enter");
  });

  test("should redirect protected routes to login when not authenticated", async ({ page }) => {
    const protectedRoutes = [
      "/en/preferences",
      "/en/watched",
      "/en/users",
      "/en/templates",
      "/en/area/test-area",
      "/en/dataset/test-dataset",
      "/en/public"
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/en\/enter/);
    }
  });

  test("should allow access to protected routes when authenticated", async ({ page }) => {
    // Create and authenticate a test user
    const user = await setupAuthenticationWithSignup(page, {
      email: `route-protection-test-${Date.now()}@example.com`,
    });

    try {
      // Test that protected routes are now accessible
      await page.goto("/en/preferences");
      await expect(page).toHaveURL("/en/preferences");

      await page.goto("/en/watched");
      await expect(page).toHaveURL("/en/watched");
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("should handle locale-specific route protection", async ({ page }) => {
    // Test Spanish locale
    await page.goto("/es/preferences");
    await expect(page).toHaveURL(/\/es\/enter/);

    // Test Portuguese locale
    await page.goto("/pt-BR/preferences");
    await expect(page).toHaveURL(/\/pt-BR\/enter/);
  });
});
