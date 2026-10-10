import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createAdminTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import {
  AMSTERDAM,
  archiveRequest,
  countProbes,
  mockTilerControl,
  OVER_CAP_COUNT,
  runCronCycle,
  waitPastJobSecond,
} from "../utils/tiler";

const TEMPLATE_ID = "clocks";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
// Past the daily refresh cadence, so the next tick refreshes the dataset
const MORE_THAN_A_DAY_MS = 25 * 60 * 60 * 1000;
const syncButton = (page: Page) =>
  page.getByTitle("Sync with the latest OpenStreetMap data");

test.describe("Admin Sync on a served tiles dataset", () => {
  const prisma = new PrismaClient();
  let user: TestUser;
  let datasetId: string;
  let servedJobId: string;

  const tilesJobId = async () => {
    const { tilesJobId } = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { tilesJobId: true },
    });
    if (!tilesJobId) throw new Error(`dataset ${datasetId} has no tile job`);
    return tilesJobId;
  };

  const clickSync = async (page: Page) => {
    const refresh = page.waitForResponse((response) =>
      response.url().includes(`/api/datasets/${datasetId}/refresh`)
    );
    await syncButton(page).click();
    expect((await refresh).ok()).toBe(true);
  };

  // Ends on the in-place page flip, before any reload
  const bakeFirstArchive = async (page: Page) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    user = await createAdminTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(PAGE);
    await expect(page.getByTestId("tiles-processing-panel")).toBeVisible();
    ({ id: datasetId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true },
    }));
    servedJobId = await tilesJobId();

    const archive = archiveRequest(page, servedJobId);
    await mockTilerControl(page, { jobId: servedJobId, state: "done" });
    expect((await archive).ok()).toBe(true);
  };

  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    // The size verdict outlives the dataset and would steer later specs
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("re-enables Sync when the first bake lands, without a reload", async ({
    page,
  }) => {
    await bakeFirstArchive(page);
    await expect(syncButton(page)).toBeEnabled({ timeout: 5_000 });
  });

  test.describe("once the archive is served", () => {
    test.beforeEach(async ({ page }) => {
      await bakeFirstArchive(page);
      await page.reload();
      await expect(syncButton(page)).toBeEnabled();

      await waitPastJobSecond(servedJobId);
    });

    test("announces the queued rebuild without a reload", async ({ page }) => {
      await clickSync(page);
      await expect(syncButton(page)).toBeDisabled({ timeout: 5_000 });
      await expect(page.getByText("Update queued")).toBeAttached({
        timeout: 5_000,
      });
    });

    test("the cron refresh submits a bake without calling Overpass", async ({
      page,
    }) => {
      // Saved, so the cron refreshes it, and due
      await prisma.dataset.update({
        where: { id: datasetId },
        data: {
          lastAttempted: new Date(Date.now() - MORE_THAN_A_DAY_MS),
          savedBy: { create: { userId: user.id } },
        },
      });
      const probesBefore = await countProbes(page);

      await runCronCycle(page);

      const row = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
        select: { tilesJobId: true, tilesState: true, tilesServedJobId: true },
      });
      expect(row.tilesJobId).not.toBe(servedJobId);
      expect(row.tilesState).toBe("pending");
      expect(row.tilesServedJobId).toBe(servedJobId);
      // Every app-side fetch starts with a count probe
      expect(await countProbes(page)).toBe(probesBefore);
    });

    test("keeps the old archive while baking, swaps on reconcile", async ({
      page,
    }) => {
      await clickSync(page);
      const newJobId = await tilesJobId();
      expect(newJobId).not.toBe(servedJobId);
      await mockTilerControl(page, {
        jobId: newJobId,
        state: "baking",
        progress: { stage: "baking", pct: 40 },
      });

      const oldArchive = archiveRequest(page, servedJobId);
      await page.reload();
      expect((await oldArchive).ok()).toBe(true);
      await expect(syncButton(page)).toBeDisabled();

      await mockTilerControl(page, { jobId: newJobId, state: "done" });
      const cycle = await runCronCycle(page);
      expect(cycle.tiles.completed).toBeGreaterThanOrEqual(1);

      const newArchive = archiveRequest(page, newJobId);
      await page.reload();
      expect((await newArchive).ok()).toBe(true);
      await expect(syncButton(page)).toBeEnabled();
    });
  });
});
