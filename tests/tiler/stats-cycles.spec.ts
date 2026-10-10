import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient, type Dataset } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import {
  AMSTERDAM,
  mockTilerControl,
  OVER_CAP_COUNT,
  runCronCycle,
  waitPastJobSecond,
} from "../utils/tiler";
import fixtureStats from "../../src/lib/mocks/tiler/stats.json";

const TEMPLATE_ID = "luggage-lockers";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
// Past the daily refresh cadence, so the next tick refreshes the dataset
const MORE_THAN_A_DAY_MS = 25 * 60 * 60 * 1000;

type Bake = {
  features: number;
  editorsCount: number;
  mostRecentElement: string;
  // One count per age bucket, freshest first
  ageBands: number[];
};

const A: Bake = {
  features: 120,
  editorsCount: 7,
  mostRecentElement: "2026-09-01T00:00:00.000Z",
  ageBands: [10, 20, 30, 60],
};
const B: Bake = {
  features: 150,
  editorsCount: 9,
  mostRecentElement: "2026-10-01T00:00:00.000Z",
  ageBands: [15, 25, 40, 70],
};

const AGE_LABELS = [
  "≤ 7 days ago",
  "8-30 days ago",
  "31-90 days ago",
  "> 90 days ago",
];

function expectRowHolds(row: Dataset, bake: Bake) {
  expect(row.stats).toMatchObject({ editorsCount: bake.editorsCount });
  expect(row.dataCount).toBe(bake.features);
  expect(row.contributorsCount).toBe(bake.editorsCount);
  expect(row.lastEditedAt?.toISOString()).toBe(bake.mostRecentElement);
}

async function expectPageShows(page: Page, bake: Bake) {
  await page.goto(PAGE);
  const header = (title: string) =>
    page.getByRole("heading", { name: title, exact: true }).locator("..");
  await expect(header("Features")).toHaveText(`Features${bake.features}`);
  await expect(header("Mappers")).toHaveText(`Mappers${bake.editorsCount}`);
  for (const [i, label] of AGE_LABELS.entries()) {
    await expect(page.locator("label").filter({ hasText: label })).toHaveText(
      `${label}${bake.ageBands[i]}`
    );
  }
}

test.describe("Tiles-only stats across bake cycles", () => {
  test.describe.configure({ mode: "serial" });

  const prisma = new PrismaClient();
  let user: TestUser;
  let datasetId: string;
  let jobA: string;
  let jobB: string;
  let lastCheckedA: Date | null;

  const row = () =>
    prisma.dataset.findUniqueOrThrow({ where: { id: datasetId } });

  const bake = (page: Page, jobId: string, stats: Bake) =>
    mockTilerControl(page, {
      jobId,
      state: "done",
      stats: { ...fixtureStats, ...stats },
    });

  // Over-cap datasets are shown to signed-in visitors only
  test.beforeEach(async ({ page }) => {
    if (user) await setupAuthenticationWithLogin(page, user);
  });

  test.afterAll(async () => {
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
    await prisma.$disconnect();
  });

  test("first bake fills the stats", async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);
    await expect(page.getByTestId("dataset-baking-page")).toBeVisible();

    const created = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    datasetId = created.id;
    jobA = created.tilesJobId!;
    // Saved, so the cron refreshes it; attempted now, so this tick only
    // reconciles
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        lastAttempted: new Date(),
        savedBy: { create: { userId: user.id } },
      },
    });

    await bake(page, jobA, A);
    await runCronCycle(page);
    // The open wait page reconciles this bake too, and the tick returns
    // early while that reconcile is still running
    await expect
      .poll(async () => (await row()).tilesServedJobId)
      .toBe(jobA);

    const filled = await row();
    expectRowHolds(filled, A);
    lastCheckedA = filled.lastChecked;

    await expectPageShows(page, A);
  });

  test("refresh submits the next bake", async ({ page }) => {
    await waitPastJobSecond(jobA);
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { lastAttempted: new Date(Date.now() - MORE_THAN_A_DAY_MS) },
    });
    await runCronCycle(page);

    const refreshed = await row();
    jobB = refreshed.tilesJobId!;
    expect(jobB).not.toBe(jobA);
    expect(refreshed.tilesState).toBe("pending");
    expect(refreshed.tilesServedJobId).toBe(jobA);
  });

  test("page keeps the last bake's numbers until the next lands", async ({
    page,
  }) => {
    await expectPageShows(page, A);
  });

  test("second bake swaps the archive", async ({ page }) => {
    await bake(page, jobB, B);
    await runCronCycle(page);

    const baked = await row();
    expect(baked.tilesServedJobId).toBe(jobB);
    expect(baked.lastChecked!.getTime()).toBeGreaterThan(
      lastCheckedA!.getTime()
    );
  });

  test("stats follow the latest bake", async ({ page }) => {
    expectRowHolds(await row(), B);
    await expectPageShows(page, B);
  });
});
