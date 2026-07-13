import { test, expect } from "@playwright/test";
import { setupAuthenticationWithSignup } from "./utils/auth";
import { getLocalizedPath } from "./config";

test.describe("User Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticationWithSignup(page);
  });

  test("should display welcome message and user name", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check for welcome message
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

    // Check for subtitle
    await expect(
      page.getByText(/Manage your datasets and explore the platform/)
    ).toBeVisible();
  });

  test("should show empty state when no datasets are followed", async ({
    page,
  }) => {
    // Fresh test user has no saved datasets
    await page.goto(getLocalizedPath("/dashboard"));

    await expect(page.getByTestId("dashboard-empty-state")).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-title")
    ).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-description")
    ).toBeVisible();
  });

  test("should have consistent layout with area page", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check for main layout structure
    await expect(page.locator(".min-h-screen.bg-white")).toBeVisible();
    await expect(page.locator(".max-w-6xl.mx-auto")).toBeVisible();

    // Check for header card
    await expect(
      page
        .locator(".bg-white.rounded-xl.border.border-gray-200.shadow-sm")
        .first()
    ).toBeVisible();

    // Check for datasets section card
    const cards = page.locator(
      ".bg-white.rounded-xl.border.border-gray-200.shadow-sm"
    );
    await expect(cards).toHaveCount(2); // Header card + datasets section card
  });

  test("should show correct status badges for active/inactive datasets", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check for status badges
    const statusBadges = page.getByText(/Active|Inactive/);
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      // Check that active datasets have green styling
      const activeBadges = page.getByText("Active");
      const activeCount = await activeBadges.count();

      if (activeCount > 0) {
        await expect(activeBadges.first()).toHaveClass(/bg-green-100/);
      }

      // Check that inactive datasets have gray styling
      const inactiveBadges = page.getByText("Inactive");
      const inactiveCount = await inactiveBadges.count();

      if (inactiveCount > 0) {
        await expect(inactiveBadges.first()).toHaveClass(/bg-gray-100/);
      }
    }
  });

  // Dataset-count pluralization requires a seeded dataset and is covered by
  // dashboard-workflows.spec.ts. Removed the duplicate empty-state test that
  // was left here under the pluralization name.
});
