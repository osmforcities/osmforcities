import { test, expect } from "@playwright/test";
import {
  createAdminTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";
import { getLocalizedPath } from "./config";

test.describe("Area data browser", () => {
  test.describe.configure({ retries: 2 });

  let testUser: { id: string; email: string; password?: string };
  let template: { id: string };
  let areaId: number;

  test.beforeEach(async ({ page }) => {
    const prisma = new PrismaClient();
    testUser = await createAdminTestUser(prisma);

    const found = await prisma.template.findFirst();
    if (!found) {
      throw new Error(
        "No template found in database. Make sure the database is seeded."
      );
    }
    template = { id: found.id };

    // A random OSM-relation-shaped id; reused across the featured/saved fixtures below.
    areaId = Math.floor(Math.random() * 100000) + 100000;
    await prisma.area.create({
      data: {
        id: areaId,
        name: "Test Area",
        countryCode: "PT",
        bounds: "0,0,1,1",
        geojson: { type: "FeatureCollection", features: [] },
      },
    });

    await prisma.$disconnect();

    await setupAuthenticationWithLogin(page, testUser);
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("Featured status filter shows only featured data types", async ({ page }) => {
    const prisma = new PrismaClient();
    // A featured dataset for this area/template.
    await prisma.dataset.create({
      data: {
        cityName: "Test City",
        isActive: true,
        isFeatured: true,
        dataCount: 42,
        templateId: template.id,
        areaId,
        geojson: { type: "FeatureCollection", features: [] },
      },
    });
    await prisma.$disconnect();

    await page.goto(getLocalizedPath(`/area/${areaId}`));

    // Default (All) grid is non-empty.
    const cards = page.locator(
      '[data-testid="template-grid"] a[href*="/dataset/"]'
    );
    await expect(cards.first()).toBeVisible();

    const allCount = await cards.count();

    // Click the Featured status facet in the sidebar.
    await page
      .getByRole("button", { name: /^Featured/ })
      .first()
      .click();

    // Featured narrows the grid and shows fewer cards than All.
    await expect(cards.first()).toBeVisible();
    const featuredCount = await cards.count();
    expect(featuredCount).toBeLessThan(allCount);
    expect(featuredCount).toBeGreaterThanOrEqual(1);
  });

  test("templates route redirects to the area page with the category", async ({
    page,
  }) => {
    await page.goto(
      getLocalizedPath(`/area/${areaId}/templates?category=healthcare`)
    );
    await expect(page).toHaveURL(
      new RegExp(`/area/${areaId}\\?category=healthcare$`)
    );
  });
});
