import type { Page } from "@playwright/test";
import { test, expect } from "./test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "./utils/auth";
import { AMSTERDAM, mockTilerControl } from "./utils/tiler";

// Each test takes its own template, so no verdict carries over from one test
// to the next
const TEMPLATE_IDS = ["benches", "playgrounds", "libraries", "post-boxes"];
// Over the 25 MB cap at 500 B per element. The tiles lane is off here, so the
// count refuses the dataset
const OVER_CAP_COUNT = 60_000;

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

  test.beforeEach(async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
  });

  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: { in: TEMPLATE_IDS } },
    });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("a timed-out count shows the timed-out wait page", async ({ page }) => {
    await mockTilerControl(page, { countTimesOut: true });
    await openDataset(page, "benches");

    const waitPage = page.getByTestId("dataset-timedOut-page");
    await expect(waitPage).toContainText("The data took too long to load.");
    await expect(waitPage).toContainText("Try again in at most 30 minutes.");
    await expect(heading(page, "Benches")).toBeVisible();
    // Probed now, not answered by a verdict an earlier run left behind
    expect(await countProbes(page)).toBe(1);
  });

  test("an over-cap count shows the too-large screen", async ({ page }) => {
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });
    await openDataset(page, "playgrounds");

    await expect(heading(page, "Playgrounds")).toBeVisible();
    await expect(page.getByText("Too large to bake.")).toBeVisible();
    expect(await countProbes(page)).toBe(1);
  });

  test("a timed-out verdict is reused without a new count probe", async ({
    page,
  }) => {
    await mockTilerControl(page, { countTimesOut: true });
    await openDataset(page, "libraries");
    await expect(page.getByTestId("dataset-timedOut-page")).toBeVisible();
    expect(await countProbes(page)).toBe(1);

    await openDataset(page, "libraries");
    await expect(page.getByTestId("dataset-timedOut-page")).toBeVisible();
    expect(await countProbes(page)).toBe(1);
  });

  test("a too-large verdict is reused without a new count probe", async ({
    page,
  }) => {
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });
    await openDataset(page, "post-boxes");
    await expect(page.getByText("Too large to bake.")).toBeVisible();
    expect(await countProbes(page)).toBe(1);

    await openDataset(page, "post-boxes");
    await expect(page.getByText("Too large to bake.")).toBeVisible();
    expect(await countProbes(page)).toBe(1);
  });
});
