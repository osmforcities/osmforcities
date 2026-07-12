import { test, expect } from "./test-setup";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";
import { getLocalizedPath } from "./config";

// Debounce + API call + render budget for the navbar search.
const LISTBOX_TIMEOUT = 30000;
const SEARCH_DEBOUNCE_WAIT = 600;

test.describe("Seamless Discovery Workflow", () => {
  let testUser: { id: string; email: string; password?: string };

  test.beforeEach(async ({ page }) => {
    const prisma = new PrismaClient();
    testUser = await createTestUser(prisma);
    await prisma.$disconnect();

    // Use fast API-based authentication
    await setupAuthenticationWithLogin(page, testUser);
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("should complete full discovery workflow: dashboard → search → area → dataset → save", async ({
    page,
  }) => {
    // Start at dashboard — fresh user sees the empty state.
    await page.goto(getLocalizedPath("/dashboard"));
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();
    await expect(page.getByTestId("dashboard-empty-state-title")).toBeVisible();

    // The navbar search is the entry point to discovery (no separate search
    // page). Assert it is present rather than silently skipping the test body.
    const searchInput = page.getByTestId("nav-search-input");
    await expect(searchInput).toBeVisible();

    // The global Nominatim mock (test-setup.ts) returns São Paulo results for
    // "são". Type, wait for the listbox, then navigate.
    await searchInput.click();
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible({
      timeout: LISTBOX_TIMEOUT,
    });
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(SEARCH_DEBOUNCE_WAIT);

    await searchInput.press("ArrowDown");
    await searchInput.press("Enter");

    // Should navigate to the area page.
    await expect(page).toHaveURL(/\/en\/area\/\d+/);

    // Should show available datasets for the area.
    await expect(page.locator("[data-testid='template-grid']")).toBeVisible();

    // Click on a dataset.
    const datasetLink = page.locator("a[href*='/dataset/']").first();
    await datasetLink.click();

    // Should navigate to the dataset page with a stable route.
    await expect(page).toHaveURL(/\/en\/area\/\d+\/dataset\/[a-zA-Z0-9-]+/);

    // Save the dataset.
    const watchButton = page.getByTestId("dataset-save-button");
    await expect(watchButton).toBeVisible();
    await watchButton.click();

    // Should flip to the unsave button.
    const unwatchButton = page.getByTestId("dataset-unsave-button");
    await expect(unwatchButton).toBeVisible();

    // Navigate back to dashboard — the saved dataset should now appear.
    await page.goto(getLocalizedPath("/dashboard"));
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();
    await expect(page.getByTestId("dashboard-dataset-count")).toContainText(
      "1/10"
    );
  });

  test("should handle stable route navigation from dashboard", async ({
    page,
  }) => {
    // Create a test dataset and save it
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst();
    if (!template) {
      throw new Error("No template found in database");
    }

    const testArea = await prisma.area.create({
      data: {
        id: Math.floor(Math.random() * 10000) + 1000,
        name: "Test City",
        countryCode: "US",
        bounds: "40.4774,-74.2591,40.9176,-73.7004",
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    const testDataset = await prisma.dataset.create({
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
    });

    await prisma.datasetSave.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });

    await prisma.$disconnect();

    await page.goto(getLocalizedPath("/dashboard"));

    // Click on dataset card
    const datasetCard = page
      .getByTestId("saved-datasets-grid")
      .locator("a")
      .first();
    await datasetCard.click();

    // Should navigate to stable route
    const expectedUrl = `/en/area/${testArea.id}/dataset/${template.id}`;
    await expect(page).toHaveURL(expectedUrl);

    // Should show dataset page with proper content
    await expect(
      page.getByRole("heading", { name: new RegExp(template.name) })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Test City/ })
    ).toBeVisible();
  });

  test("should maintain save state across navigation", async ({ page }) => {
    // Create a test dataset and save it
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst();
    if (!template) {
      throw new Error("No template found in database");
    }

    const testArea = await prisma.area.create({
      data: {
        id: Math.floor(Math.random() * 10000) + 1000,
        name: "Test City",
        countryCode: "US",
        bounds: "40.4774,-74.2591,40.9176,-73.7004",
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    const testDataset = await prisma.dataset.create({
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
    });

    await prisma.datasetSave.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });

    await prisma.$disconnect();

    // Navigate to dataset page
    const stableUrl = `/en/area/${testArea.id}/dataset/${template.id}`;
    await page.goto(stableUrl);

    // Should show unsave button (already saved) since we created a save record
    // Wait for page to load and button to appear
    const unwatchButton = page.getByTestId("dataset-unsave-button");
    await expect(unwatchButton).toBeVisible({ timeout: 10000 });

    // Navigate back to dashboard
    await page.goto(getLocalizedPath("/dashboard"));

    // Should show the dataset in followed list
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();
    await expect(page.getByTestId("dashboard-dataset-count")).toContainText(
      "1/10"
    );
  });

  test("should handle multiple saved datasets", async ({ page }) => {
    // Create multiple test datasets with different templates
    const prisma = new PrismaClient();

    const templates = await prisma.template.findMany({ take: 3 });
    if (templates.length < 3) {
      throw new Error("Need at least 3 templates in database");
    }

    const testArea = await prisma.area.create({
      data: {
        id: Math.floor(Math.random() * 10000) + 1000,
        name: "Test City",
        countryCode: "US",
        bounds: "40.4774,-74.2591,40.9176,-73.7004",
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    // Create 3 datasets with different templates
    for (let i = 0; i < 3; i++) {
      const testDataset = await prisma.dataset.create({
        data: {
          cityName: `Test City ${i}`,
          isActive: true,
          dataCount: 10,
          templateId: templates[i].id,
          areaId: testArea.id,
          geojson: {
            type: "FeatureCollection",
            features: [],
          },
        },
      });

      await prisma.datasetSave.create({
        data: {
          datasetId: testDataset.id,
          userId: testUser.id,
        },
      });
    }

    await prisma.$disconnect();

    await page.goto(getLocalizedPath("/dashboard"));

    // Should show multiple datasets
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();
    await expect(page.getByTestId("dashboard-dataset-count")).toContainText(
      "3/10"
    );

    // Should show multiple dataset cards
    const datasetCards = page
      .getByTestId("saved-datasets-grid")
      .locator("div");
    const cardCount = await datasetCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
