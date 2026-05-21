import { test, expect } from "./test-setup";
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

test.describe.serial("Feature detail panel", () => {
  test.beforeEach(async ({ page }) => {
    const prisma = new PrismaClient();
    const user = await createTestUser(prisma);
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, user);
  });

  test("sidebar shows dataset info by default", async ({ page }) => {
    await page.goto("/en/area/271110/dataset/bicycle-parking");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator("[data-testid='dataset-sidebar-default']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='feature-detail-panel']")
    ).toBeHidden();
  });

  test("selecting a feature swaps sidebar to detail panel", async ({ page }) => {
    await page.goto("/en/area/271110/dataset/bicycle-parking");
    await page.waitForLoadState("domcontentloaded");
    await page
      .locator("[data-testid='dataset-sidebar-default']")
      .waitFor({ state: "visible" });

    await page.waitForFunction(() => "__triggerFeatureSelect" in window);

    await page.evaluate(() => {
      const trigger = (
        window as unknown as Record<string, unknown>
      ).__triggerFeatureSelect as (f: unknown) => void;
      trigger({
        type: "Feature",
        geometry: { type: "Point", coordinates: [-46.63, -23.55] },
        properties: {
          id: "node/123456",
          name: "Test Bicycle Parking",
          bicycle_parking: "stands",
          capacity: "8",
          ageCategory: "recent",
        },
      });
    });

    await expect(
      page.locator("[data-testid='feature-detail-panel']")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Bicycle Parking" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open in OpenStreetMap/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /Back/i }).click();

    await expect(
      page.locator("[data-testid='dataset-sidebar-default']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='feature-detail-panel']")
    ).toBeHidden();
  });
});
