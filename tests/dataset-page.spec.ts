import { test, expect } from "@playwright/test";
import { createTestUser, setupAuthenticationWithLogin } from "./utils/auth";
import { PrismaClient } from "@prisma/client";

test.describe("Dataset Page", () => {
  test.beforeEach(async ({ page }) => {
    // Create and login test user
    const prisma = new PrismaClient();
    const user = await createTestUser(prisma);
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, user);
  });

  test("should handle template not found error", async ({ page }) => {
    // Navigate to a non-existent template
    await page.goto("/area/298470/dataset/non-existent-template");

    // Should show template not found error
    await expect(page.locator("text=Template Not Found")).toBeVisible();
  });

  test("should handle invalid area ID", async ({ page }) => {
    await page.goto("/area/invalid/dataset/bicycle-parking");

    // Should show 404 page since notFound() is called for invalid area IDs
    await expect(page.locator("text=404")).toBeVisible();
  });

  test("should handle malformed template IDs", async ({ page }) => {
    const invalidIds = [
      "BICYCLE-PARKING", // uppercase
      "bicycle_parking", // underscore
      "bicycle parking", // space
    ];

    for (const invalidId of invalidIds) {
      await page.goto(`/area/298470/dataset/${invalidId}`);
      await expect(page.locator("text=Template Not Found")).toBeVisible();
    }
  });

  test("should display breadcrumb navigation", async ({ page }) => {
    await page.goto("/area/298470/dataset/bicycle-parking");

    // Should show breadcrumb navigation
    await expect(page.locator("[data-testid='breadcrumb-nav']")).toBeVisible();
  });
});
