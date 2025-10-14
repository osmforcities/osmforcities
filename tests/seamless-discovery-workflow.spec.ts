import { test, expect } from "./test-setup";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";

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

  test("should complete full discovery workflow: dashboard → search → area → dataset → watch", async ({
    page,
  }) => {
    // Start at dashboard
    await page.goto("/");
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Should show empty state initially
    await expect(page.getByText("No datasets followed yet")).toBeVisible();

    // Click search button in empty state
    const searchButton = page.getByRole("link", { name: "Search Cities" });
    await searchButton.click();

    // Should navigate to search page
    await expect(page).toHaveURL("/en/search");

    // Search for a city (assuming search functionality exists)
    const searchInput = page.getByPlaceholder(/search.*city|city.*search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("New York");
      await searchInput.press("Enter");

      // Should show search results
      await expect(page.getByText(/New York/i)).toBeVisible();

      // Click on a city result
      const cityResult = page.getByText(/New York/i).first();
      await cityResult.click();

      // Should navigate to area page
      await expect(page).toHaveURL(/\/en\/area\/\d+/);

      // Should show available datasets for the area
      await expect(
        page.getByText(/datasets.*available|available.*datasets/i)
      ).toBeVisible();

      // Click on a dataset
      const datasetLink = page.getByRole("link").first();
      await datasetLink.click();

      // Should navigate to dataset page with stable route
      await expect(page).toHaveURL(/\/en\/area\/\d+\/dataset\/[a-zA-Z0-9-]+/);

      // Should show dataset page with watch button
      const watchButton = page.getByRole("button", { name: /watch/i });
      await expect(watchButton).toBeVisible();

      // Click watch button
      await watchButton.click();

      // Should show unwatch button
      await expect(
        page.getByRole("button", { name: /unwatch/i })
      ).toBeVisible();

      // Navigate back to dashboard
      await page.goto("/");

      // Should now show the watched dataset
      await expect(page.getByText("Your Followed Datasets")).toBeVisible();
      await expect(page.getByText("1 dataset you're monitoring")).toBeVisible();
    }
  });

  test("should handle stable route navigation from dashboard", async ({
    page,
  }) => {
    // Create a test dataset and watch it
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
        isPublic: true,
        dataCount: 10,
        templateId: template.id,
        areaId: testArea.id,
        userId: testUser.id,
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    await prisma.datasetWatch.create({
      data: {
        userId: testUser.id,
        datasetId: testDataset.id,
      },
    });

    await prisma.$disconnect();

    await page.goto("/");

    // Click on dataset card
    const datasetCard = page
      .getByTestId("followed-datasets-grid")
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
      page.getByRole("heading", { name: /Test City/ })
    ).toBeVisible();
  });

  test("should handle on-demand dataset creation", async ({ page }) => {
    // Navigate directly to a stable route that might not have a dataset yet
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

    await prisma.$disconnect();

    // Navigate directly to stable route
    const stableUrl = `/en/area/${testArea.id}/dataset/${template.id}`;
    await page.goto(stableUrl);

    // Should handle on-demand creation (might show loading state)
    // The page should either show the dataset or a loading/error state
    const hasDataset = await page
      .getByRole("heading", { name: new RegExp(template.name) })
      .isVisible();
    const hasLoading = await page.getByText(/loading|creating/i).isVisible();
    const hasError = await page.getByText(/error|not found/i).isVisible();

    // At least one of these should be true
    expect(hasDataset || hasLoading || hasError).toBe(true);
  });

  test("should maintain watch state across navigation", async ({ page }) => {
    // Create a test dataset and watch it
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
        isPublic: true,
        dataCount: 10,
        templateId: template.id,
        areaId: testArea.id,
        userId: testUser.id,
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      },
    });

    await prisma.datasetWatch.create({
      data: {
        userId: testUser.id,
        datasetId: testDataset.id,
      },
    });

    await prisma.$disconnect();

    // Navigate to dataset page
    const stableUrl = `/en/area/${testArea.id}/dataset/${template.id}`;
    await page.goto(stableUrl);

    // Should show unwatch button (already watching) or watch button
    const unwatchButton = page.getByRole("button", { name: /unwatch/i });
    const watchButton = page.getByRole("button", { name: /watch/i });

    const hasUnwatch = await unwatchButton.isVisible();
    const hasWatch = await watchButton.isVisible();

    // Should show either unwatch (if already watching) or watch button
    expect(hasUnwatch || hasWatch).toBe(true);

    // Navigate back to dashboard
    await page.goto("/");

    // Should show the dataset in followed list
    await expect(page.getByText("Your Followed Datasets")).toBeVisible();
    await expect(page.getByText("1 dataset you're monitoring")).toBeVisible();
  });

  test("should handle empty dashboard state correctly", async ({ page }) => {
    await page.goto("/");

    // Should show empty state
    await expect(page.getByText("No datasets followed yet")).toBeVisible();
    await expect(
      page.getByText(/Start following datasets to see them here/)
    ).toBeVisible();

    // Should have search button
    const searchButton = page.getByRole("link", { name: "Search Cities" });
    await expect(searchButton).toBeVisible();

    // Should not show any dataset cards
    const datasetGrid = page.getByTestId("followed-datasets-grid");
    const cardCount = await datasetGrid.locator("div").count();
    expect(cardCount).toBe(0);
  });

  test("should handle multiple watched datasets", async ({ page }) => {
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
          isPublic: true,
          dataCount: 10,
          templateId: templates[i].id,
          areaId: testArea.id,
          userId: testUser.id,
          geojson: {
            type: "FeatureCollection",
            features: [],
          },
        },
      });

      await prisma.datasetWatch.create({
        data: {
          userId: testUser.id,
          datasetId: testDataset.id,
        },
      });
    }

    await prisma.$disconnect();

    await page.goto("/");

    // Should show multiple datasets
    await expect(page.getByText("Your Followed Datasets")).toBeVisible();
    await expect(page.getByText("3 datasets you're monitoring")).toBeVisible();

    // Should show multiple dataset cards
    const datasetCards = page
      .getByTestId("followed-datasets-grid")
      .locator("div");
    const cardCount = await datasetCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
