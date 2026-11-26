import { readFileSync } from "node:fs";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import {
  AMSTERDAM,
  archiveRequest,
  mockTilerControl,
  OVER_CAP_COUNT,
  runCronCycle,
} from "../utils/tiler";

// Not used by any other spec
const TEMPLATE_ID = "benches";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
const REACTIVATION_SQL = readFileSync(
  "prisma/migrations/20261124120000_reactivate_size_capped_datasets/migration.sql",
  "utf8"
);
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

test.describe("A dataset the app deactivated for being over its size cap", () => {
  const prisma = new PrismaClient();
  let user: TestUser;
  let datasetId: string;

  const tilesJobId = async () => {
    const { tilesJobId } = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { tilesJobId: true },
    });
    return String(tilesJobId);
  };

  test.beforeEach(async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });
    await prisma.area.upsert({
      where: { id: AMSTERDAM },
      create: { id: AMSTERDAM, name: "Amsterdam" },
      update: {},
    });
    const deactivatedAt = new Date(Date.now() - TWO_MONTHS_MS);
    ({ id: datasetId } = await prisma.dataset.create({
      data: {
        templateId: TEMPLATE_ID,
        areaId: AMSTERDAM,
        cityName: "Amsterdam",
        isActive: false,
        dataCount: OVER_CAP_COUNT,
        createdAt: deactivatedAt,
        lastAttempted: deactivatedAt,
        consecutiveFailures: 1,
        lastError:
          "Dataset too large: estimated 28.6 MB of data (max 25.0 MB). Try a smaller area.",
      },
    }));
    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await prisma.$executeRawUnsafe(REACTIVATION_SQL);
  });

  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    await prisma.dataset.deleteMany({ where: { id: datasetId } });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("unsaved, opens through the wait page and gets its map", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const waitPage = page.getByTestId("dataset-baking-page");
    await expect(waitPage).toBeVisible();

    const jobId = await tilesJobId();
    const archive = archiveRequest(page, jobId);
    await mockTilerControl(page, { jobId, state: "done" });
    expect((await archive).ok()).toBe(true);
    await expect(waitPage).toBeHidden();
  });

  test("saved, waits for the scheduled refresh to bake it", async ({ page }) => {
    await prisma.datasetSave.create({
      data: { userId: user.id, datasetId },
    });

    await page.goto(PAGE);
    await expect(page.getByTestId("dataset-counting-page")).toBeVisible();

    await runCronCycle(page);
    const jobId = await tilesJobId();
    await mockTilerControl(page, { jobId, state: "done" });
    const reconcile = await runCronCycle(page);
    expect(reconcile.tiles.completed).toBeGreaterThanOrEqual(1);

    const archive = archiveRequest(page, jobId);
    await page.goto(PAGE);
    expect((await archive).ok()).toBe(true);
    await expect(
      page.getByRole("region", { name: "Dataset statistics" })
    ).toBeVisible();
  });
});
