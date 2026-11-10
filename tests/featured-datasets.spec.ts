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

// Amsterdam; the mock Overpass route returns features for any query, so
// datasets created here have dataCount > 0 and show up in the hero.
const AREA_ID = 271110;
const FEATURED_TEMPLATE_ID = "bicycle-parking";
const FEATURED_PATH = `/en/area/${AREA_ID}/dataset/${FEATURED_TEMPLATE_ID}`;
const NON_FEATURED_PATH = `/en/area/${AREA_ID}/dataset/drinking-water`;
const UPSELL_HEADING = { name: "Sign in to view" };
const DATASET_VIEW = "[data-testid='dataset-sidebar-default']";

test.describe.serial("Featured datasets", () => {
  let admin: TestUser;

  test.beforeAll(async ({ browser }) => {
    const prisma = new PrismaClient();
    admin = await createAdminTestUser(prisma);

    // Seed through the app: visiting creates the dataset, the admin save keeps
    // it out of other specs' cleanupTestUser, the toggle busts the hero cache.
    // Being the only featured dataset makes the hero's random pick deterministic.
    const page = await browser.newPage();
    await setupAuthenticationWithLogin(page, admin);
    await page.goto(FEATURED_PATH);
    await expect(page.locator(DATASET_VIEW)).toBeVisible();

    const { id } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: FEATURED_TEMPLATE_ID },
      select: { id: true },
    });
    await prisma.$disconnect();

    expect((await page.request.post(`/api/datasets/${id}/save`)).ok()).toBe(true);
    const toggle = await page.request.put(`/api/datasets/${id}/feature`);
    expect(toggle.ok()).toBe(true);
    expect(await toggle.json()).toMatchObject({ isFeatured: true });
    await page.close();
  });

  // Dropping the admin's save leaves the featured dataset unsaved, so
  // cleanupTestUser deletes it along with the user.
  test.afterAll(async () => {
    if (admin) await cleanupTestUser(admin.id);
  });

  test("homepage hero links to the featured dataset (logged out)", async ({ page }) => {
    // Tiles lane off: the hero draws the stored geojson
    const slimGeojson = page.waitForResponse((response) =>
      response.url().includes("/geojson?slim")
    );
    await page.goto("/en");
    expect((await slimGeojson).ok()).toBe(true);
    await page.getByRole("link", { name: /— View dataset$/ }).click();

    await expect(page).toHaveURL(new RegExp(`${FEATURED_PATH}$`));
    await expect(page.locator(DATASET_VIEW)).toBeVisible();
    await expect(page.getByRole("heading", UPSELL_HEADING)).toBeHidden();
  });

  test("non-featured dataset shows the upsell (logged out)", async ({ page }) => {
    await page.goto(NON_FEATURED_PATH);

    await expect(page.getByRole("heading", UPSELL_HEADING)).toBeVisible();
  });

  test("magic-link sign-in from the upsell returns to the dataset", async ({ page }) => {
    const prisma = new PrismaClient();
    const user = await createTestUser(prisma);

    try {
      await page.goto(NON_FEATURED_PATH);
      await page.getByRole("link", { name: "Continue with email" }).click();
      await expect(page).toHaveURL(/\/en\/enter\?returnTo=/);

      await page.getByPlaceholder("Email").fill(user.email);
      const sent = page.waitForResponse("**/api/auth/send-magic-link");
      await page.getByRole("button", { name: "Continue" }).click();
      expect(JSON.parse((await sent).request().postData()!)).toMatchObject({
        returnTo: NON_FEATURED_PATH,
      });
      await expect(page.getByText("Check your email")).toBeVisible();

      // Email is off in e2e: rebuild the link the send route mails
      const { token } = await prisma.verificationToken.findFirstOrThrow({
        where: { identifier: user.email },
      });
      const link = new URLSearchParams({ token, returnTo: NON_FEATURED_PATH });
      await page.goto(`/api/auth/verify?${link}`);

      await expect(page).toHaveURL(new RegExp(`${NON_FEATURED_PATH}$`));
      await expect(page.locator(DATASET_VIEW)).toBeVisible();
    } finally {
      await prisma.$disconnect();
      await cleanupTestUser(user.id);
    }
  });

  test("non-featured dataset is fully accessible (logged in)", async ({ page }) => {
    const prisma = new PrismaClient();
    const user = await createTestUser(prisma);
    await prisma.$disconnect();

    try {
      await setupAuthenticationWithLogin(page, user);
      await page.goto(NON_FEATURED_PATH);

      await expect(page.locator(DATASET_VIEW)).toBeVisible();
      await expect(page.getByRole("heading", UPSELL_HEADING)).toBeHidden();
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test("featured catalog lists the dataset (logged out)", async ({ page }) => {
    await page.goto("/en/explore/featured");

    await expect(page.getByRole("heading", { name: "Featured", level: 1 })).toBeVisible();
    await expect(page.locator(`a[href$='${FEATURED_PATH}']`)).toBeVisible();
  });

  test("area topic page is public and links the dataset (logged out)", async ({ page }) => {
    await page.goto(`/en/area/${AREA_ID}/topics/mobility`);

    await expect(
      page
        .locator("[data-testid='dataset-cards']")
        .locator(`a[href$='/dataset/${FEATURED_TEMPLATE_ID}']`)
    ).toBeVisible();
  });
});
