import type { Page } from "@playwright/test";
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
  mockTilerControl,
  OVER_CAP_COUNT,
  runCronCycle,
  waitPastJobSecond,
} from "../utils/tiler";

// Same template as create.spec: tests run one at a time and each cleans up
// its dataset
const TEMPLATE_ID = "fountains";
const MINUTE_MS = 60 * 1000;

test.describe("Tiler failure handling", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  const readDataset = (id: string) =>
    prisma.dataset.findUniqueOrThrow({
      where: { id },
      select: {
        tilesJobId: true,
        tilesState: true,
        tilesError: true,
        consecutiveFailures: true,
        lastError: true,
        lastAttempted: true,
      },
    });

  const setLastAttempted = (id: string, lastAttempted: Date | null) =>
    prisma.dataset.update({ where: { id }, data: { lastAttempted } });

  /**
   * A tiles-only dataset with its first bake queued, saved so the cron
   * refreshes it. The page is left afterwards so its status poll cannot
   * reconcile ahead of the cycle under test.
   */
  async function createSavedDataset(page: Page) {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);
    await expect(page.getByTestId("tiles-processing-panel")).toBeVisible();

    const { id, tilesJobId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true, tilesJobId: true },
    });
    expect(tilesJobId).toBeTruthy();
    expect((await page.request.post(`/api/datasets/${id}/save`)).ok()).toBe(true);
    await page.goto("about:blank");
    return { id, tilesJobId: tilesJobId as string };
  }

  /**
   * Works around https://github.com/osmforcities/osmforcities/issues/616: a
   * never-attempted row mid-first-bake is due at once, so the cycle would
   * resubmit it before reconciling. Marking it attempted leaves the cycle only
   * the reconcile.
   */
  async function failFirstBake(
    page: Page,
    dataset: { id: string; tilesJobId: string },
    job: { errorKind: string; error: string }
  ) {
    await setLastAttempted(dataset.id, new Date());
    await mockTilerControl(page, { jobId: dataset.tilesJobId, state: "failed", ...job });
    await runCronCycle(page);
  }

  // The over-cap verdict outlives the dataset and would steer a later spec on
  // the same area and template
  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("a failed bake marks the dataset failed", async ({ page }) => {
    const dataset = await createSavedDataset(page);
    await failFirstBake(page, dataset, {
      errorKind: "overpass",
      error: "Overpass returned 504",
    });

    expect(await readDataset(dataset.id)).toMatchObject({
      tilesState: "failed",
      consecutiveFailures: 1,
    });

    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);
    await expect(page.getByTestId("tiles-failed-panel")).toContainText(
      "Something went wrong while processing the map data."
    );
  });

  // A saved row mid-first-bake is resubmitted on the first cycle:
  // https://github.com/osmforcities/osmforcities/issues/616
  test.fail("a first bake still running is not resubmitted", async ({ page }) => {
    const dataset = await createSavedDataset(page);
    await waitPastJobSecond(dataset.tilesJobId);

    await runCronCycle(page);
    expect(await readDataset(dataset.id)).toMatchObject({
      tilesState: "pending",
      tilesJobId: dataset.tilesJobId,
    });
  });

  test("a failed bake is resubmitted only after its 15 minute wait", async ({
    page,
  }) => {
    const dataset = await createSavedDataset(page);
    await failFirstBake(page, dataset, {
      errorKind: "overpass",
      error: "Overpass returned 504",
    });

    await setLastAttempted(dataset.id, new Date(Date.now() - 14 * MINUTE_MS));
    // Nothing due at all, so a stray due row cannot hide a resubmit
    expect(await runCronCycle(page)).toMatchObject({ totalFound: 0 });
    expect(await readDataset(dataset.id)).toMatchObject({
      tilesState: "failed",
      tilesJobId: dataset.tilesJobId,
    });

    await waitPastJobSecond(dataset.tilesJobId);
    await setLastAttempted(dataset.id, new Date(Date.now() - 16 * MINUTE_MS));
    await runCronCycle(page);
    const resubmitted = await readDataset(dataset.id);
    expect(resubmitted.tilesState).toBe("pending");
    expect(resubmitted.tilesJobId).not.toBe(dataset.tilesJobId);
  });

  test("a too-large refusal is not retried on the hourly rungs", async ({
    page,
  }) => {
    const dataset = await createSavedDataset(page);
    await failFirstBake(page, dataset, {
      errorKind: "too_large",
      error: "query exceeds maxsize",
    });

    const failed = await readDataset(dataset.id);
    expect(failed.tilesError).toMatch(/^too_large:/);

    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);
    await expect(page.getByTestId("tiles-failed-panel")).toContainText(
      "This dataset is too large to process right now."
    );
    await page.goto("about:blank");

    await setLastAttempted(dataset.id, new Date(Date.now() - (6 * 60 + 1) * MINUTE_MS));
    expect(await runCronCycle(page)).toMatchObject({ totalFound: 0 });
    expect(await readDataset(dataset.id)).toMatchObject({
      tilesState: "failed",
      tilesJobId: dataset.tilesJobId,
    });
  });

  test("a failed submit counts as a failure", async ({ page }) => {
    const dataset = await createSavedDataset(page);
    await mockTilerControl(page, { submitFails: true });

    await runCronCycle(page);
    const row = await readDataset(dataset.id);
    expect(row).toMatchObject({ tilesState: "failed", consecutiveFailures: 1 });
    expect(row.lastError).toContain("Tiler submit failed: 500");
  });

  test("a tiler outage skips the refresh without charging the dataset", async ({
    page,
  }) => {
    const dataset = await createSavedDataset(page);
    await mockTilerControl(page, { tilerDown: true });

    expect(await runCronCycle(page)).toMatchObject({ tilerUnreachable: true });
    expect(await readDataset(dataset.id)).toMatchObject({
      tilesJobId: dataset.tilesJobId,
      consecutiveFailures: 0,
      lastAttempted: null,
    });
  });
});
