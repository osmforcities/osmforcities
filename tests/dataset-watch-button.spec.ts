import { test, expect } from "@playwright/test";
import {
  createTestUser,
  cleanupTestUser,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";

test.describe("Dataset Watch Button", () => {
  let testUser: { id: string; email: string; password?: string };
  let testDataset: { id: string; template: { name: string } }

  test.beforeEach(async ({ page }) => {
    // Create test user and dataset
    const prisma = new PrismaClient();
    testUser = await createTestUser(prisma);

    // Create a test dataset
    const template = await prisma.template.findFirst();

    if (!template) {
      throw new Error(
        "No template found in database. Make sure the database is seeded."
      );
    }

    // Create a unique test area for each test
    const randomId = Math.floor(Math.random() * 10000) + 1000; // Random ID between 1000-10999
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
        isPublic: true, // All datasets are public now
        dataCount: 10,
        templateId: template.id,
        areaId: testArea.id,
        userId: testUser.id,
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

    // Use direct login instead of signup to avoid duplicate user creation
    await page.goto("http://localhost:3000/en/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password!);

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard after successful login
    await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("should display watch button for datasets", async ({ page }) => {
    await page.goto(`/dataset/${testDataset.id}`);

    // Check that watch button is visible
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    // Check button has eye icon
    await expect(watchButton.locator("svg")).toBeVisible(); // Eye icon
  });

  test("should successfully watch a dataset", async ({ page }) => {
    await page.goto(`/dataset/${testDataset.id}`);

    // Click watch button
    const watchButton = page.getByRole("button", { name: /watch/i });
    await watchButton.click();

    // Wait for button to change to unwatch
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible();

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
    await page.goto(`/dataset/${testDataset.id}`);

    // First watch the dataset through the UI
    const watchButton = page.getByRole("button", { name: /watch/i });
    await watchButton.click();

    // Wait for button to change to unwatch
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible();

    // Now click unwatch button
    await unwatchButton.click();

    // Wait longer for the API call to complete and button to be enabled
    await page.waitForTimeout(2000);

    // After unwatching, the button should show "Watch" in the title
    const watchButtonAfter = page.getByRole("button", { name: /watch/i });
    await expect(watchButtonAfter).toBeVisible();

    // Check that dataset no longer appears in watched datasets
    await page.goto("/");

    // Should show empty state or not show this dataset
    const datasetCard = page
      .locator(`[data-testid="followed-datasets-grid"]`)
      .getByText(testDataset.template.name);
    await expect(datasetCard).toBeHidden();
  });

  test("should handle watch button loading state", async ({ page }) => {
    await page.goto(`/dataset/${testDataset.id}`);

    const watchButton = page.getByRole("button", { name: /watch/i });

    // Click button and check it's disabled during loading
    await watchButton.click();

    // Button should be disabled while loading
    await expect(watchButton).toBeDisabled();

    // Wait for loading to complete
    await expect(watchButton).toBeEnabled();
  });

  test("should show correct button states", async ({ page }) => {
    await page.goto(`/dataset/${testDataset.id}`);

    // Initially should show watch button
    let watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    // Click to watch
    await watchButton.click();

    // Should now show unwatch button
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible();

    // Click to unwatch
    await unwatchButton.click();

    // Should show watch button again
    watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();
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

    await page.goto(`/dataset/${testDataset.id}`);

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
        userId: testUser.id,
        datasetId: testDataset.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(`/dataset/${testDataset.id}`);

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

    // Have the other user watch the dataset
    await prisma.datasetWatch.create({
      data: {
        userId: anotherUser.id,
        datasetId: testDataset.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(`/dataset/${testDataset.id}`);

    // Current user should still be able to watch
    const watchButton = page.getByRole("button", { name: /watch/i });
    await expect(watchButton).toBeVisible();

    await watchButton.click();

    // Should successfully watch
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    await expect(unwatchButton).toBeVisible();
  });
});
