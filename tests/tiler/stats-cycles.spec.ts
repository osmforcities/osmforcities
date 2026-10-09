import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import fixtureStats from "../../src/lib/mocks/tiler/stats.json";

// Amsterdam, with a template no other spec creates there
const AREA_ID = 271110;
const TEMPLATE_ID = "clocks";
const PAGE = `/en/area/${AREA_ID}/dataset/${TEMPLATE_ID}`;
// Over the 25 MB cap at 500 B per element: the tiles-only lane
const OVER_CAP_COUNT = 60_000;
const CRON_SECRET = "test-cron-secret"; // .env.test
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

const control = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

const tick = async (page: Page) => {
  const response = await page.request.post("/api/tasks/update-datasets", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);
};

async function expectRowHolds(prisma: PrismaClient, id: string, bake: Bake) {
  const row = await prisma.dataset.findUniqueOrThrow({ where: { id } });
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
    control(page, {
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
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
    await prisma.$disconnect();
  });

  test("first bake fills the stats", async ({ page }) => {
    expect((await control(page, { reset: true })).ok()).toBe(true);
    await control(page, { overpassCount: OVER_CAP_COUNT });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);
    await expect(page.getByTestId("tiles-processing-panel")).toBeVisible();

    const created = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
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
    await tick(page);
    // The open wait page reconciles this bake too, and the tick returns
    // early while that reconcile is still running
    await expect
      .poll(async () => (await row()).tilesServedJobId)
      .toBe(jobA);

    await expectRowHolds(prisma, datasetId, A);
    lastCheckedA = (await row()).lastChecked;

    await expectPageShows(page, A);
  });

  test("refresh submits the next bake", async ({ page }) => {
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { lastAttempted: new Date(Date.now() - MORE_THAN_A_DAY_MS) },
    });
    await tick(page);

    const refreshed = await row();
    jobB = refreshed.tilesJobId!;
    expect(jobB).not.toBe(jobA);
    expect(refreshed.tilesState).toBe("pending");
    expect(refreshed.tilesServedJobId).toBe(jobA);
  });

  test("page keeps the last bake's numbers until the next lands", async ({
    page,
  }) => {
    // Known bug: the refresh writes the count probe's element count to
    // dataCount, so Features shows 60k until a bake corrects it. The stats
    // freeze keeps the rest on A. Fixed by the reconcile-authority change,
    // https://github.com/osmforcities/osmforcities/issues/606
    test.fail();
    await expectPageShows(page, A);
  });

  test("second bake swaps the archive", async ({ page }) => {
    await bake(page, jobB, B);
    await tick(page);

    const baked = await row();
    expect(baked.tilesServedJobId).toBe(jobB);
    expect(baked.lastChecked!.getTime()).toBeGreaterThan(
      lastCheckedA!.getTime()
    );
  });

  test("stats follow the latest bake", async ({ page }) => {
    // Known bug (stats freeze): reconcile copies the tiler's stats only while
    // the row has none, so B's never land. Fixed by the reconcile-authority
    // change, https://github.com/osmforcities/osmforcities/issues/606
    test.fail();
    await expectRowHolds(prisma, datasetId, B);
    await expectPageShows(page, B);
  });
});
