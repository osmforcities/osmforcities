import { test, expect } from "@playwright/test";
import { getLocalizedPath } from "./config";
import {
  setupAuthenticationWithSignup,
  cleanupTestUser,
  TestUser,
} from "./utils/auth";

test.describe("Area Page", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = await setupAuthenticationWithSignup(page);
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser.id);
  });

  test("should display area information and datasets", async ({ page }) => {
    const areaId = "298470";

    // Navigate to area page
    await page.goto(getLocalizedPath(`/area/${areaId}`));
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load completely
    await expect(page.locator("h1")).toBeVisible();

    // Check that we're not on a 404 page
    await expect(page.locator("h1")).not.toContainText("404");

    await expect(page.locator("[data-testid='dataset-cards']")).toBeVisible();

    await page.getByRole("link", { name: /^Mobility \d+$/ }).click();
    await expect(page).toHaveURL(/\/area\/298470\/topics\/mobility$/);
    const topicChip = page.getByRole("link", { name: "Clear Mobility" });
    await expect(topicChip).toBeVisible();

    await page.getByRole("link", { name: /^Bicycle \d+$/ }).click();
    await expect(page).toHaveURL(/\/topics\/mobility\/cycling$/);
    await expect(page.getByRole("link", { name: "Clear Bicycle" })).toBeVisible();

    await topicChip.click();
    await expect(page).toHaveURL(/\/area\/298470$/);
    await expect(page.getByRole("heading", { name: "Pick a topic" })).toBeVisible();
  });

  test("should display clickable dataset cards", async ({ page }) => {
    const areaId = "298470";

    // Navigate to area page
    await page.goto(getLocalizedPath(`/area/${areaId}`));
    await page.waitForLoadState("domcontentloaded");

    // Wait for templates to load
    await expect(page.locator("[data-testid='dataset-cards']")).toBeVisible();

    // Check that dataset cards are present and clickable
    const datasetCards = page.locator("a[href*='/dataset/']");
    await expect(datasetCards.first()).toBeVisible();

    // Verify dataset links have correct structure
    const firstDatasetLink = datasetCards.first();
    const href = await firstDatasetLink.getAttribute("href");
    expect(href).toMatch(/\/area\/298470\/dataset\/[^\/]+$/);

    // Check that dataset cards have proper content
    await expect(firstDatasetLink.locator("h3")).toBeVisible(); // Dataset name
  });

  test("search finds a dataset and Back returns to the results", async ({ page }) => {
    await page.goto(getLocalizedPath("/area/298470/topics/mobility"));
    await page.getByRole("searchbox").fill("bakery");
    await expect(page).toHaveURL(/\/area\/298470\/topics\/mobility\?q=bakery$/);

    await page.getByRole("link", { name: /^Bakeries/ }).click();
    await expect(page).toHaveURL(/\/area\/298470\/dataset\/bakeries$/);

    await page.goBack();
    await expect(page.getByRole("searchbox")).toHaveValue("bakery");
    await expect(page.getByRole("link", { name: /^Bakeries/ })).toBeVisible();
  });

  // Invalid area ID 404 handling is covered by dataset-page.spec.ts.
  // pt-BR template rendering is covered by dataset-translations.spec.ts.

  test("should display templates in Portuguese (pt-BR)", async ({ page }) => {
    // Create user with pt-BR language and authenticate
    testUser = await setupAuthenticationWithSignup(page, { language: "pt-BR" });

    // Navigate to pt-BR locale - the middleware will redirect from /en to /pt-BR
    // due to user's language preference, so we go directly to the area page
    await page.goto(getLocalizedPath("/area/298470", "pt-BR"));
    await page.waitForLoadState("domcontentloaded");

    // Wait for templates to load
    await expect(page.locator("[data-testid='dataset-cards']")).toBeVisible();

    await expect(page.locator("text=Pontos de ônibus")).toBeVisible();
  });
});
