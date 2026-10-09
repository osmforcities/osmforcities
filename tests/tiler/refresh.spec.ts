import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createAdminTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";

// Amsterdam, with a template no other spec creates there
const AREA_ID = 271110;
const TEMPLATE_ID = "clocks";
// Over the 25 MB cap at 500 B per element: the tiles-only lane
const OVER_CAP_COUNT = 60_000;
const PAGE = `/en/area/${AREA_ID}/dataset/${TEMPLATE_ID}`;
// From .env.test, which the tiler server loads under NODE_ENV=test
const CRON_ROUTE_SECRET = "test-cron-secret";

const control = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

const archiveRequest = (page: Page, jobId: string) =>
  page.waitForResponse((response) =>
    response.url().includes(`/api/tiles/${jobId}.pmtiles`)
  );

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

  // Every test starts from a first bake already served
  test.beforeEach(async ({ page }) => {
    expect((await control(page, { reset: true })).ok()).toBe(true);
    await control(page, { overpassCount: OVER_CAP_COUNT });

    user = await createAdminTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(PAGE);
    await expect(page.getByTestId("tiles-processing-panel")).toBeVisible();
    ({ id: datasetId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
      select: { id: true },
    }));
    servedJobId = await tilesJobId();

    const archive = archiveRequest(page, servedJobId);
    await control(page, { jobId: servedJobId, state: "done" });
    expect((await archive).ok()).toBe(true);

    // The in-place page flip keeps Sync disabled from the pending first paint
    // (useState seeded once); a fresh load is the served state under test
    await page.reload();
    await expect(syncButton(page)).toBeEnabled();
  });

  // The verdict outlives the dataset and would steer a later spec on the same
  // area and template
  test.afterEach(async ({ page }) => {
    await control(page, { reset: true });
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("announces the queued rebuild without a reload", async ({ page }) => {
    // Known bug: the refresh route discards submitTilesForDataset's result and
    // returns no tilesState, so refreshOutcome never sees "pending" and the
    // button re-enables claiming "Dataset synced".
    // https://github.com/osmforcities/osmforcities/issues/583
    test.fail();
    await clickSync(page);
    await expect(syncButton(page)).toBeDisabled({ timeout: 5_000 });
    await expect(page.getByText("Update queued")).toBeAttached({
      timeout: 5_000,
    });
  });

  test("keeps the old archive while baking, swaps on reconcile", async ({
    page,
  }) => {
    await clickSync(page);
    const newJobId = await tilesJobId();
    expect(newJobId).not.toBe(servedJobId);
    await control(page, {
      jobId: newJobId,
      state: "baking",
      progress: { stage: "baking", pct: 40 },
    });

    // Blue/green: the pending rebuild leaves the served archive in place
    const oldArchive = archiveRequest(page, servedJobId);
    await page.reload();
    expect((await oldArchive).ok()).toBe(true);
    await expect(syncButton(page)).toBeDisabled();

    await control(page, { jobId: newJobId, state: "done" });
    const tick = await page.request.post("/api/tasks/update-datasets", {
      headers: { Authorization: `Bearer ${CRON_ROUTE_SECRET}` },
    });
    expect(tick.ok()).toBe(true);
    expect((await tick.json()).data.tiles.completed).toBeGreaterThanOrEqual(1);

    const newArchive = archiveRequest(page, newJobId);
    await page.reload();
    expect((await newArchive).ok()).toBe(true);
    await expect(syncButton(page)).toBeEnabled();
  });
});
