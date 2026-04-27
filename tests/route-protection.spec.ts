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
      "/en/dashboard",
      "/en/preferences",
      "/en/users",
      "/en/templates",
      "/en/area/test-area",
      "/en/dataset/test-dataset",
    ];

    for (const route of protectedRoutes) {
      // Verify redirect happens
      await page.goto(route);
      await expect(page).toHaveURL(/\/en\/enter/);

      // Verify we're NOT on the protected route (security check)
      await expect(page).not.toHaveURL(route);
    }
  });

  test("should verify middleware is actively protecting routes", async ({ page }) => {
    // This test reinforces that protected routes redirect to login
    // The original bug (pathname.includes("/")) made all routes public

    // Test dashboard - should redirect to login
    await page.goto("/en/dashboard");
    const url = page.url();
    expect(url).toContain("/en/enter");
    expect(url).not.toContain("/dashboard");

    // Test another protected route - should also redirect
    await page.goto("/en/users");
    const usersUrl = page.url();
    expect(usersUrl).toContain("/en/enter");
    expect(usersUrl).not.toContain("/users");
  });

  test("should block path traversal attacks", async ({ page }) => {
    // This test ensures path normalization prevents traversal attacks
    // Attackers trying /en/about/../dashboard should still be blocked

    await page.goto("/en/about/../dashboard");
    const url = page.url();
    expect(url).toContain("/en/enter");
    expect(url).not.toContain("/dashboard");
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

      await page.goto("/en/dashboard");
      await expect(page).toHaveURL("/en/dashboard");
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
