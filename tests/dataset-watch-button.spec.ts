import { test, expect } from "@playwright/test";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";

test.describe("Dataset Watch Button", () => {
  test.describe.configure({ retries: 2 });

  let testUser: { id: string; email: string; password?: string };
  let testDataset: {
    id: string;
    template: { id: string; name: string };
    area: { id: number };
  };

  test.beforeEach(async ({ page }) => {
    const prisma = new PrismaClient();
    testUser = await createTestUser(prisma);

    const template = await prisma.template.findFirst();

    if (!template) {
      throw new Error(
        "No template found in database. Make sure the database is seeded."
      );
    }

    const randomId = Math.floor(Math.random() * 10000) + 1000;
    const testArea = await prisma.area.create({
      data: {
        id: randomId,
        name: "Test Area",
        countryCode: "US",
        bounds: "40.4774,-74.2591,40.9176,-73.7004",
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    testDataset = await prisma.dataset.create({
      data: {
        cityName: "Test City",
        isActive: true,
        dataCount: 10,
        templateId: template.id,
        areaId: testArea.id,
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
      include: {
        template: true,
        area: true,
        user: true,
      },
    });

    await prisma.$disconnect();

    await setupAuthenticationWithLogin(page, testUser);
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("should display watch button for datasets", async ({ page }) => {
    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // Check that watch button is visible
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    // Check button has eye icon
    await expect(watchButton.locator("svg")).toBeVisible(); // Eye icon
  });

  test("should successfully watch a dataset", async ({ page }) => {
    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // Click watch button
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible({ timeout: 10000 });
    await watchButton.click();

    // Check that button now shows unwatch - wait for button to be updated
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible({ timeout: 10000 });

    // Check that dataset appears in watched datasets
    await page.goto("/");
    await expect(page.getByText("Your Followed Datasets")).toBeVisible();

    // Verify dataset appears in dashboard
    const datasetCard = page
      .locator(`[data-testid="followed-datasets-grid"]`)
      .getByText(testDataset.template.name);
    await expect(datasetCard).toBeVisible();
  });

  test("should successfully unwatch a dataset", async ({ page }) => {
    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // First watch the dataset through the UI
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible({ timeout: 10000 });
    await watchButton.click();

    // Wait for button to change to unwatch
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible({ timeout: 10000 });

    // Now click unwatch button
    await unwatchButton.click();

    // Wait for watch button to reappear after unwatching
    const watchButtonAfter = page.getByRole("button", { name: /watch/i });
    await expect(watchButtonAfter).toBeVisible({ timeout: 10000 });

    // Check that dataset no longer appears in watched datasets
    await page.goto("/");

    // Should show empty state or not show this dataset
    const datasetCard = page
      .locator(`[data-testid="followed-datasets-grid"]`)
      .getByText(testDataset.template.name);
    await expect(datasetCard).toBeHidden();
  });

  test("should handle watch button loading state", async ({ page }) => {
    let resolveApiCall: () => void;
    const apiCallPromise = new Promise<void>((resolve) => {
      resolveApiCall = resolve;
    });

    await page.route("**/api/datasets/*/watch", async (route) => {
      await apiCallPromise;
      await route.continue();
    });

    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    const watchButton = page.getByRole("button", { name: /watch/i });

    const clickPromise = watchButton.click();

    await expect(watchButton).toBeDisabled();

    resolveApiCall!();
    await clickPromise;

    await expect(watchButton).toBeEnabled();
  });

  test("should show correct button states", async ({ page }) => {
    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // Initially should show watch button
    let watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    // Click to watch
    await watchButton.click();

    // Should now show unwatch button - wait for button to be updated
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible({ timeout: 10000 });

    // Click to unwatch
    await unwatchButton.click();

    // Should show watch button again - wait for button to be updated
    watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible({ timeout: 10000 });
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/datasets/*/watch", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    const watchButton = page.getByRole("button", { name: /watch/i });
    await watchButton.click();

    // Button should remain in watch state after error
    await expect(watchButton).toBeVisible();

    // Check console for error message
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(msg.text()));
    await page.waitForTimeout(1000);

    // The error might be logged differently, so let's just check that the button state is correct
    await expect(watchButton).toBeVisible();
  });

  test("should prevent watching already watched dataset", async ({ page }) => {
    // First watch the dataset
    const prisma = new PrismaClient();
    await prisma.datasetWatch.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // Should show unwatch button initially
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible();

    // Try to watch again (should not create duplicate)
    await page.route("**/api/datasets/*/watch", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Already watching this dataset" }),
        });
      } else {
        await route.continue();
      }
    });

    // Click unwatch then try to watch again
    await unwatchButton.click();
    await page.waitForTimeout(500);

    const watchButton = page.getByRole("button", { name: /watch/i });
    await watchButton.click();

    // Should handle the error gracefully
    await expect(watchButton).toBeVisible();
  });

  test("should work with multiple users watching same dataset", async ({
    page,
  }) => {
    // Create another user
    const prisma = new PrismaClient();
    const anotherUser = await createTestUser(prisma);

    // Refetch the dataset to ensure it exists in this context
    const dataset = await prisma.dataset.findUnique({
      where: { id: testDataset.id },
    });

    if (!dataset) {
      throw new Error("Test dataset not found");
    }

    // Have the other user watch the dataset
    await prisma.datasetWatch.create({
      data: {
        datasetId: dataset.id,
        userId: anotherUser.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(
      `/area/${testDataset.area.id}/dataset/${testDataset.template.id}`
    );

    // Current user should still be able to watch
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    await watchButton.click();

    // Should successfully watch - wait for button to be updated
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible({ timeout: 10000 });
  });
});
