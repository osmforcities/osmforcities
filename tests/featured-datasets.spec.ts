import { test, expect } from "./test-setup";
import { PrismaClient } from "@prisma/client";
import {
  createAdminTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  cleanupTestUser,
  TestUser,
} from "./utils/auth";

/**
 * Featured dataset flow: featured datasets are public, everything else
 * sends logged-out visitors to the upsell page.
 */

const AREA_ID = 271110;
const FEATURED_PATH = `/en/area/${AREA_ID}/dataset/bicycle-parking`;
const NON_FEATURED_PATH = `/en/area/${AREA_ID}/dataset/drinking-water`;
const UPSELL_HEADING = { name: "Sign in to view" };

test.describe.serial("Featured datasets", () => {
  let admin: TestUser;
  let datasetId: string;

  test.beforeAll(async ({ browser }) => {
    const prisma = new PrismaClient();
    admin = await createAdminTestUser(prisma);

    // Seed through the app: visiting creates the dataset, the admin save keeps
    // it out of other specs' cleanupTestUser, the toggle busts the hero cache.
    const page = await browser.newPage();
    await setupAuthenticationWithLogin(page, admin);
    await page.goto(FEATURED_PATH);
    await expect(
      page.locator("[data-testid='dataset-sidebar-default']")
    ).toBeVisible();

    const dataset = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: "bicycle-parking" },
      select: { id: true },
    });
    datasetId = dataset.id;
    await prisma.$disconnect();

    expect((await page.request.post(`/api/datasets/${datasetId}/save`)).ok()).toBe(true);
    const toggle = await page.request.put(`/api/datasets/${datasetId}/feature`);
    expect(await toggle.json()).toMatchObject({ isFeatured: true });
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupAuthenticationWithLogin(page, admin);
    await page.request.put(`/api/datasets/${datasetId}/feature`);
    await page.close();
    await cleanupTestUser(admin.id);
  });

  test("homepage hero links to the featured dataset (logged out)", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: /— View dataset$/ }).click();

    await expect(page).toHaveURL(new RegExp(`${FEATURED_PATH}$`));
    await expect(
      page.locator("[data-testid='dataset-sidebar-default']")
    ).toBeVisible();
    await expect(page.getByRole("heading", UPSELL_HEADING)).toBeHidden();
  });

  test("non-featured dataset shows the upsell (logged out)", async ({ page }) => {
    await page.goto(NON_FEATURED_PATH);

    await expect(page.getByRole("heading", UPSELL_HEADING)).toBeVisible();
  });

  test("non-featured dataset is fully accessible (logged in)", async ({ page }) => {
    const prisma = new PrismaClient();
    const user = await createTestUser(prisma);
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, user);

    await page.goto(NON_FEATURED_PATH);

    await expect(page.locator("main h1, main h2").first()).toBeVisible();
    await expect(page.getByRole("heading", UPSELL_HEADING)).toBeHidden();
    await cleanupTestUser(user.id);
  });

  test("featured catalog lists the dataset (logged out)", async ({ page }) => {
    await page.goto("/en/explore/featured");

    await expect(page.getByRole("heading", { name: "Featured", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /bicycle parking dataset in/i })
    ).toBeVisible();
  });

  test("area page is public and marks the featured template (logged out)", async ({ page }) => {
    await page.goto(`/en/area/${AREA_ID}`);

    const grid = page.locator("[data-testid='template-grid']");
    await expect(grid).toBeVisible();
    await expect(grid.locator("svg[aria-label='Featured']")).toBeVisible();
  });
});
