import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createAdminTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import { archiveRequest, mockTilerControl } from "../utils/tiler";

const AMSTERDAM = 271110;
const TEMPLATE_ID = "clocks";
const TILES_ONLY_COUNT = 60_000;
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
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

  test.beforeEach(async ({ page }) => {
    // TEMP diagnostic: which client error opens the dev overlay in CI
    page.on("pageerror", (e) => console.log(`[pageerror] ${e.stack}`));
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[console.error] ${m.text()}`);
    });
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: TILES_ONLY_COUNT });

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

    // Sync stays disabled after the in-place flip until a full load
    await page.reload();
    await expect(syncButton(page)).toBeEnabled();
  });

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

  test("announces the queued rebuild without a reload", async ({ page }) => {
    // Bug: the refresh route returns no tilesState, so Sync claims success.
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
    // The tick also refreshes a due cataloged dataset: give it the real count
    await mockTilerControl(page, { overpassCount: null });
    const tick = await page.request.post("/api/tasks/update-datasets", {
      headers: { Authorization: `Bearer ${process.env.CRON_ROUTE_SECRET}` },
    });
    expect(tick.ok()).toBe(true);
    expect((await tick.json()).data.tiles.completed).toBeGreaterThanOrEqual(1);

    const newArchive = archiveRequest(page, newJobId);
    await page.reload();
    expect((await newArchive).ok()).toBe(true);
    await expect(syncButton(page)).toBeEnabled();
  });
});
