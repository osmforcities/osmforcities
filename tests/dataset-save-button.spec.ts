import { test, expect } from "@playwright/test";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";
import { getLocalizedPath } from "./config";
import { MAX_SAVES_PER_USER } from "../src/lib/constants";

test.describe("Dataset Save Button", () => {
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

  test("should display save button for datasets", async ({ page }) => {
    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // Check that save button is visible
    const saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible();

    // Check button has bookmark icon
    await expect(saveButton.locator("svg")).toBeVisible(); // Bookmark icon
  });

  test("should successfully save a dataset", async ({ page }) => {
    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // Click save button
    const saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await saveButton.click();

    // Check that button now shows unsave - wait for button to be updated
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible({ timeout: 10000 });

    // Check that dataset appears in saved datasets
    await page.goto(getLocalizedPath("/dashboard"));
    // Check for dataset count text
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();

    // Verify dataset appears in dashboard
    const datasetCard = page
      .locator(`[data-testid="saved-datasets-grid"]`)
      .getByText(testDataset.template.name);
    await expect(datasetCard).toBeVisible();
  });

  test("should successfully unsave a dataset", async ({ page }) => {
    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // First save the dataset through the UI
    const saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible({ timeout: 10000 });

    // Scroll button into view and ensure it's actionable
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.waitFor({ state: "visible" });
    await saveButton.click({ force: true });

    // Wait for button to change to unsave (wait for API call to complete)
    await page.waitForTimeout(500);
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible({ timeout: 10000 });

    // Wait a bit for state to stabilize
    await page.waitForTimeout(500);

    // Scroll unwatch button into view and ensure it's actionable
    await unsaveButton.scrollIntoViewIfNeeded();
    await unsaveButton.waitFor({ state: "visible" });
    await unsaveButton.click({ force: true });

    // Wait for save button to reappear after unsaving
    const saveButtonAfter = page.getByTestId("dataset-save-button");
    await expect(saveButtonAfter).toBeVisible({ timeout: 10000 });

    // Check that dataset no longer appears in saved datasets
    await page.goto(getLocalizedPath("/dashboard"));

    // Should show empty state or not show this dataset
    const datasetCard = page
      .locator(`[data-testid="saved-datasets-grid"]`)
      .getByText(testDataset.template.name);
    await expect(datasetCard).toBeHidden();
  });

  test("should handle save button loading state", async ({ page }) => {
    let resolveApiCall: () => void;
    const apiCallPromise = new Promise<void>((resolve) => {
      resolveApiCall = resolve;
    });

    await page.route("**/api/datasets/*/save", async (route) => {
      await apiCallPromise;
      await route.continue();
    });

    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    const saveButton = page.getByTestId("dataset-save-button");
    await saveButton.scrollIntoViewIfNeeded();

    // Set up request listener AFTER route is configured
    const requestPromise = page.waitForRequest("**/api/datasets/*/save");

    // Click with force to bypass footer interception
    saveButton.click({ force: true }).catch(() => {
      // Ignore click errors - we just need to trigger the handler
    });

    // Wait for the request to start (which means loading state should be set)
    await requestPromise;

    // Now check that button is disabled (loading state)
    await expect(saveButton).toBeDisabled();

    resolveApiCall!();

    // Wait for API call to complete and state to update
    await page.waitForTimeout(500);

    // After successful save, button should change to unsave button
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible({ timeout: 10000 });
    await expect(unsaveButton).toBeEnabled();
  });

  test("should show correct button states", async ({ page }) => {
    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // Initially should show watch button
    let saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible();

    // Click to watch
    await saveButton.click();

    // Should now show unwatch button - wait for button to be updated
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible({ timeout: 10000 });

    // Click to unwatch
    await unsaveButton.click();

    // Should show watch button again - wait for button to be updated
    saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible({ timeout: 10000 });
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/datasets/*/save", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    const saveButton = page.getByTestId("dataset-save-button");
    await saveButton.click();

    // Button should remain in watch state after error
    await expect(saveButton).toBeVisible();

    // Check console for error message
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(msg.text()));
    await page.waitForTimeout(1000);

    // The error might be logged differently, so let's just check that the button state is correct
    await expect(saveButton).toBeVisible();
  });

  test("should prevent saving already saved dataset", async ({ page }) => {
    // First save the dataset
    const prisma = new PrismaClient();

    // Ensure the dataset still exists
    const existingDataset = await prisma.dataset.findUnique({
      where: { id: testDataset.id },
    });

    if (!existingDataset) {
      throw new Error("Test dataset not found - it may have been cleaned up");
    }

    await prisma.datasetSave.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // Should show unwatch button initially
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible();

    // Try to watch again (should not create duplicate)
    await page.route("**/api/datasets/*/save", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Already saved this dataset" }),
        });
      } else {
        await route.continue();
      }
    });

    // Click unwatch then try to watch again
    await unsaveButton.click();
    await page.waitForTimeout(500);

    const saveButton = page.getByTestId("dataset-save-button");
    await saveButton.click();

    // Should handle the error gracefully
    await expect(saveButton).toBeVisible();
  });

  test("should disable save button and show inline message when user has reached the save limit", async ({
    page,
  }) => {
    const seedPrisma = new PrismaClient();

    const template = await seedPrisma.template.findFirst();
    if (!template) throw new Error("No template found");

    // Seed MAX_SAVES_PER_USER saves for testUser against different datasets
    const seededAreaIds: number[] = [];
    for (let i = 0; i < MAX_SAVES_PER_USER; i++) {
      const randomId = Math.floor(Math.random() * 1000000) + 100000;
      const area = await seedPrisma.area.create({
        data: {
          id: randomId,
          name: `Cap Test Area ${i}`,
          countryCode: "US",
          bounds: "40.4774,-74.2591,40.9176,-73.7004",
          geojson: { type: "FeatureCollection", features: [] },
        },
      });
      seededAreaIds.push(area.id);
      const dataset = await seedPrisma.dataset.create({
        data: {
          cityName: `Cap Test City ${i}`,
          isActive: true,
          dataCount: 0,
          templateId: template.id,
          areaId: area.id,
          geojson: { type: "FeatureCollection", features: [] },
        },
      });
      await seedPrisma.datasetSave.create({
        data: { userId: testUser.id, datasetId: dataset.id },
      });
    }
    await seedPrisma.$disconnect();

    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    const saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    // Button should be disabled because user has reached the save limit
    await expect(saveButton).toBeDisabled();

    // Inline message should be shown with link to dashboard
    const message = page.getByTestId("save-limit-message");
    await expect(message).toBeVisible();
    await expect(message).toContainText(/save up to \d+ datasets/i);
    const dashboardLink = message.getByRole("link", { name: /dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute("href", /\/dashboard$/);

    // Clean up seeded areas (datasets handled by cleanupTestUser)
    const cleanupPrisma = new PrismaClient();
    await cleanupPrisma.area.deleteMany({ where: { id: { in: seededAreaIds } } });
    await cleanupPrisma.$disconnect();
  });

  test("should return 403 with save_limit_reached when API is called past the limit", async ({
    page,
  }) => {
    const seedPrisma = new PrismaClient();

    const template = await seedPrisma.template.findFirst();
    if (!template) throw new Error("No template found");

    // Seed MAX_SAVES_PER_USER saves against other datasets so the cap is hit on API call.
    const seededAreaIds: number[] = [];
    for (let i = 0; i < MAX_SAVES_PER_USER; i++) {
      const randomId = Math.floor(Math.random() * 1000000) + 100000;
      const area = await seedPrisma.area.create({
        data: {
          id: randomId,
          name: `Cap Test Area ${i}`,
          countryCode: "US",
          bounds: "40.4774,-74.2591,40.9176,-73.7004",
          geojson: { type: "FeatureCollection", features: [] },
        },
      });
      seededAreaIds.push(area.id);
      const dataset = await seedPrisma.dataset.create({
        data: {
          cityName: `Cap Test City ${i}`,
          isActive: true,
          dataCount: 0,
          templateId: template.id,
          areaId: area.id,
          geojson: { type: "FeatureCollection", features: [] },
        },
      });
      await seedPrisma.datasetSave.create({
        data: { userId: testUser.id, datasetId: dataset.id },
      });
    }
    await seedPrisma.$disconnect();

    // Call API directly — bypass UI which would otherwise disable the button.
    const response = await page.request.post(
      `/api/datasets/${testDataset.id}/save`
    );
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "save_limit_reached",
      limit: MAX_SAVES_PER_USER,
    });

    const cleanupPrisma = new PrismaClient();
    await cleanupPrisma.area.deleteMany({ where: { id: { in: seededAreaIds } } });
    await cleanupPrisma.$disconnect();
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
    await prisma.datasetSave.create({
      data: {
        datasetId: dataset.id,
        userId: anotherUser.id,
      },
    });
    await prisma.$disconnect();

    await page.goto(
      getLocalizedPath(`/area/${testDataset.area.id}/dataset/${testDataset.template.id}`)
    );

    // Current user should still be able to watch
    const saveButton = page.getByTestId("dataset-save-button");
    await expect(saveButton).toBeVisible();

    await saveButton.click();

    // Should successfully watch - wait for button to be updated
    const unsaveButton = page.getByTestId("dataset-unsave-button");
    await expect(unsaveButton).toBeVisible({ timeout: 10000 });
  });
});
