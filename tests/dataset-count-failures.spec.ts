import type { Page } from "@playwright/test";
import { test, expect } from "./test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "./utils/auth";
import { AMSTERDAM, mockTilerControl, OVER_CAP_COUNT } from "./utils/tiler";

// One template per test, so a failure points at one verdict kind
const TEMPLATE_IDS = ["benches", "playgrounds"];

const openDataset = (page: Page, templateId: string) =>
  page.goto(`/en/area/${AMSTERDAM}/dataset/${templateId}`);

const countProbes = async (page: Page): Promise<number> =>
  (await (await page.request.get("/api/mock-tiler/control")).json())
    .countProbes;

const heading = (page: Page, templateName: string) =>
  page.getByRole("heading", { name: `${templateName} in Amsterdam` });

test.describe("Count failures on the dataset page", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  // Also before each test: a run killed mid-test leaves its verdict behind
  const clearVerdicts = () =>
    prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: { in: TEMPLATE_IDS } },
    });

  test.beforeEach(async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await clearVerdicts();
    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
  });

  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    await clearVerdicts();
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("a timed-out count shows the timed-out wait page, then reuses its verdict", async ({
    page,
  }) => {
    await mockTilerControl(page, { countTimesOut: true });

    for (const visit of [1, 2]) {
      await openDataset(page, "benches");
      const waitPage = page.getByTestId("dataset-timedOut-page");
      await expect(waitPage).toContainText("The data took too long to load.");
      await expect(waitPage).toContainText("Try again in at most 30 minutes.");
      await expect(heading(page, "Benches")).toBeVisible();
      // One probe on the first visit, none on the second
      expect(await countProbes(page), `visit ${visit}`).toBe(1);
    }
  });

  test("an over-cap count shows the too-large screen, then reuses its verdict", async ({
    page,
  }) => {
    // The tiles lane is off in this project, so over the cap is a refusal
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    for (const visit of [1, 2]) {
      await openDataset(page, "playgrounds");
      await expect(heading(page, "Playgrounds")).toBeVisible();
      await expect(page.getByText("Too large to bake.")).toBeVisible();
      expect(await countProbes(page), `visit ${visit}`).toBe(1);
    }
  });
});
