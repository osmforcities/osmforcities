import type { Page } from "@playwright/test";
import { test, expect } from "./test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "./utils/auth";
import { controlMockTiler as control } from "./utils/mock-tiler";

// Amsterdam. Each test takes its own template, so no count verdict carries
// over from one test to the next
const AREA_ID = 271110;
const TEMPLATE_IDS = ["benches", "playgrounds", "libraries", "post-boxes"];
// Over the 25 MB cap at 500 B per element. The tiles lane is off here, so the
// count refuses the dataset
const OVER_CAP_COUNT = 60_000;

const openDataset = (page: Page, templateId: string) =>
  page.goto(`/en/area/${AREA_ID}/dataset/${templateId}`);

const countQueries = async (page: Page): Promise<number> =>
  (await (await page.request.get("/api/mock-tiler/control")).json())
    .countQueries;

const heading = (page: Page, templateName: string) =>
  page.getByRole("heading", { name: `${templateName} in Amsterdam` });

test.describe("Count failures on the dataset page", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    expect((await control(page, { reset: true })).ok()).toBe(true);
    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
  });

  test.afterEach(async ({ page }) => {
    await control(page, { reset: true });
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AREA_ID, templateId: { in: TEMPLATE_IDS } },
    });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("a timed-out count shows the timed-out wait page", async ({ page }) => {
    await control(page, { countTimesOut: true });
    await openDataset(page, "benches");

    const waitPage = page.getByTestId("dataset-timedOut-page");
    await expect(waitPage).toContainText("The data took too long to load.");
    await expect(waitPage).toContainText("Try again in at most 30 minutes.");
    await expect(heading(page, "Benches")).toBeVisible();
  });

  test("an over-cap count shows the too-large screen", async ({ page }) => {
    await control(page, { overpassCount: OVER_CAP_COUNT });
    await openDataset(page, "playgrounds");

    await expect(heading(page, "Playgrounds")).toBeVisible();
    await expect(page.getByText("Too large to bake.")).toBeVisible();
  });

  test("a cached timeout is shown again without a new count", async ({
    page,
  }) => {
    await control(page, { countTimesOut: true });
    await openDataset(page, "libraries");
    await expect(page.getByTestId("dataset-timedOut-page")).toBeVisible();
    const counted = await countQueries(page);

    await openDataset(page, "libraries");
    await expect(page.getByTestId("dataset-timedOut-page")).toBeVisible();
    expect(await countQueries(page)).toBe(counted);
  });

  test("a cached too-large verdict is shown again without a new count", async ({
    page,
  }) => {
    await control(page, { overpassCount: OVER_CAP_COUNT });
    await openDataset(page, "post-boxes");
    await expect(page.getByText("Too large to bake.")).toBeVisible();
    const counted = await countQueries(page);

    await openDataset(page, "post-boxes");
    await expect(page.getByText("Too large to bake.")).toBeVisible();
    expect(await countQueries(page)).toBe(counted);
  });
});
