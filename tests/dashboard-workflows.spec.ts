import { test, expect } from "./test-setup";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
  type TestUser,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";
import { getLocalizedPath } from "./config";
import enMessages from "../messages/en.json";

test.describe("Dashboard Page - Essential Workflows", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    // Create test user
    const prisma = new PrismaClient();
    testUser = await createTestUser(prisma);
    await prisma.$disconnect();

    await setupAuthenticationWithLogin(page, testUser, "/en/dashboard");
  });

  test.afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("should display dashboard title and subtitle", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check for welcome message
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

    // Check for subtitle
    await expect(page.getByTestId("dashboard-subtitle")).toBeVisible();

    // Check for new tab navigation
    await expect(page.getByTestId("tab-saved")).toBeVisible();
    await expect(page.getByTestId("tab-users")).toBeHidden(); // Regular user shouldn't see Users tab
  });

  test("should show empty state when no datasets are followed", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check for empty state
    await expect(page.getByTestId("dashboard-empty-state")).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-title")
    ).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-description")
    ).toBeVisible();

    // Ensure tab navigation is still visible
    await expect(page.getByTestId("tab-saved")).toBeVisible();
  });

  test("should display saved datasets when user has saved datasets", async ({
    page,
  }) => {
    // Create a test dataset and save it
    const prisma = new PrismaClient();

    // Get a template
    const template = await prisma.template.findFirst({
      include: { category: true },
    });
    if (!template) {
      throw new Error("No template found in database");
    }

    // Create a test area
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

    // Create a test dataset
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
      include: {
        template: true,
        area: true,
      },
    });

    // Watch the dataset
    await prisma.datasetSave.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });

    await prisma.$disconnect();

    await page.goto(getLocalizedPath("/dashboard"));

    // Check for datasets section - no heading exists in new design

    // Check for dataset count
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();

    // Check for dataset card
    const datasetGrid = page.getByTestId("saved-datasets-grid");
    await expect(datasetGrid).toBeVisible();

    // Check for dataset card content
    await expect(page.getByText(template.name)).toBeVisible();
    await expect(page.getByText("Test City")).toBeVisible();
    await expect(page.getByText("(US)")).toBeVisible();

    // Ensure tab navigation is still visible
    await expect(page.getByTestId("tab-saved")).toBeVisible();
  });

  test("should navigate to stable route when clicking dataset card", async ({
    page,
  }) => {
    // Create a test dataset and watch it
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst({
      include: { category: true },
    });
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
    await expect(page).toHaveURL(
      new RegExp(`/en/area/${testArea.id}/dataset/${template.id}`)
    );
  });

  test("should display correct dataset card information", async ({ page }) => {
    // Create a test dataset and watch it
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst({
      include: { category: true },
    });
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
      include: {
        template: true,
        area: true,
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

    // Check dataset card structure
    const datasetCard = page
      .getByTestId("saved-datasets-grid")
      .locator("div")
      .first();

    // Check for template name
    await expect(datasetCard.getByText(template.name)).toBeVisible();

    // Check for city name
    await expect(datasetCard.getByText("Test City")).toBeVisible();

    // Check for country code
    await expect(datasetCard.getByText("(US)")).toBeVisible();

    // Check for category badge
    const categoryLabels: Record<string, string> = enMessages.CategoryLabel;
    await expect(
      datasetCard.getByText(categoryLabels[template.category.slug], { exact: true })
    ).toBeVisible();

    // Check for status badge
    await expect(datasetCard.getByText("Active")).toBeVisible();
  });

  test("should handle save count display", async ({ page }) => {
    // Create a test dataset and save it
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst({
      include: { category: true },
    });
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

    // Watch the dataset
    await prisma.datasetSave.create({
      data: {
        datasetId: testDataset.id,
        userId: testUser.id,
      },
    });

    await prisma.$disconnect();

    await page.goto(getLocalizedPath("/dashboard"));

    // Check for save count
    await expect(page.getByText("1 save")).toBeVisible();
  });

  test("should be responsive on different screen sizes", async ({ page }) => {
    // Create a test dataset to ensure grid is visible
    const prisma = new PrismaClient();

    const template = await prisma.template.findFirst({
      include: { category: true },
    });
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

    const datasetGrid = page.getByTestId("saved-datasets-grid");

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(datasetGrid).toHaveClass(/grid-cols-1/);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(datasetGrid).toHaveClass(/md:grid-cols-2/);

    // Test desktop view
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(datasetGrid).toHaveClass(/lg:grid-cols-3/);
  });

  test("should handle dataset count pluralization", async ({ page }) => {
    // Create multiple test datasets with different templates
    const prisma = new PrismaClient();

    const templates = await prisma.template.findMany({ take: 2 });
    if (templates.length < 2) {
      throw new Error("Need at least 2 templates in database");
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

    // Create 2 datasets with different templates
    for (let i = 0; i < 2; i++) {
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

    // Check for plural form
    await expect(page.getByTestId("dashboard-dataset-count")).toBeVisible();
    await expect(
      page.getByTestId("dashboard-dataset-count")
    ).toContainText("2/10");
  });
});

test.describe("Dashboard - Seamless Discovery Integration", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    const prisma = new PrismaClient();
    testUser = await createTestUser(prisma);
    await prisma.$disconnect();

    await setupAuthenticationWithLogin(page, testUser, "/en/dashboard");
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("should not show old wizard workflow buttons", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Should not show old buttons
    await expect(
      page.getByRole("link", { name: "Browse Public Datasets" })
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Create Dataset" })
    ).toBeHidden();

    // Welcome back should be visible
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();
  });

  test("should show clean dashboard without authorship references", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Should not show authorship-related content
    await expect(page.getByText(/created by|author|owner/)).toBeHidden();
    await expect(page.getByText(/public|private/)).toBeHidden();
  });

  test("should have proper empty state guidance", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check empty state guidance
    await expect(page.getByTestId("dashboard-empty-state")).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-title")
    ).toBeVisible();
    await expect(
      page.getByTestId("dashboard-empty-state-description")
    ).toBeVisible();
  });

  test("should display tab navigation without breaking existing functionality", async ({ page }) => {
    await page.goto(getLocalizedPath("/dashboard"));

    // Check that tab navigation is visible
    await expect(page.getByTestId("tab-saved")).toBeVisible();
    await expect(page.getByTestId("tab-users")).toBeHidden(); // Regular user shouldn't see Users tab

    // Check that existing dashboard functionality still works
    await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

    // Check for dashboard grid or empty state
    const grid = page.getByTestId("saved-datasets-grid");
    const emptyState = page.getByTestId("dashboard-empty-state");

    const hasGrid = await grid.isVisible();
    const isEmpty = await emptyState.isVisible();

    expect(hasGrid || isEmpty).toBe(true);

    // Check that welcome message and subtitle are still present
    await expect(
      page.getByText("Manage your datasets and explore the platform")
    ).toBeVisible();
  });
});
