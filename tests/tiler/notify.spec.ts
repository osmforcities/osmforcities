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
  mockTilerControl,
  runCronCycle,
  waitPastJobSecond,
} from "../utils/tiler";
import fixtureStats from "../../src/lib/mocks/tiler/stats.json";

// Not used by any other spec. Tests share the area+template row, made fresh
// each time because cleanupTestUser deletes unsaved datasets
const TEMPLATE_ID = "give-box";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
// Past the daily refresh cadence, so the next tick refreshes the dataset
const MORE_THAN_A_DAY_MS = 25 * 60 * 60 * 1000;
const CONFIRMED = "Saved. You'll get an email when the map is ready.";

const notifyButton = (page: Page) =>
  page.getByRole("button", { name: "Save and email me if it gets mapped" });

// The tiler server runs with EMAIL_DISABLE, but a sent mail still clears the
// save's flag, so the flag is what these tests watch
test.describe("Ready notification from the empty state", () => {
  const prisma = new PrismaClient();
  let user: TestUser | undefined;

  const readSave = (datasetId: string) =>
    prisma.datasetSave.findUnique({
      where: { userId_datasetId: { userId: user!.id, datasetId } },
      select: { notifyWhenReady: true },
    });

  const tilesJobId = async (datasetId: string) => {
    const { tilesJobId } = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { tilesJobId: true },
    });
    if (!tilesJobId) throw new Error("dataset has no tiles job");
    return tilesJobId;
  };

  // Admin, because Sync is how landBake submits a bake
  async function optInOnEmptyDataset(page: Page) {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassEmpty: true });

    user = await createAdminTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);
    await notifyButton(page).click();
    await expect(page.getByRole("status")).toHaveText(CONFIRMED);

    const { id } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true },
    });
    return id;
  }

  // Sync sets lastAttempted, so the cycle only reconciles. The page is left
  // first so it cannot reconcile ahead of the cycle.
  async function landBake(
    page: Page,
    datasetId: string,
    stats?: Partial<typeof fixtureStats>
  ) {
    const before = await tilesJobId(datasetId);
    await waitPastJobSecond(before);
    const sync = await page.request.post(`/api/datasets/${datasetId}/refresh`);
    expect(sync.ok()).toBe(true);
    await page.goto("about:blank");

    const jobId = await tilesJobId(datasetId);
    expect(jobId).not.toBe(before);
    await mockTilerControl(page, { jobId, state: "done", stats });

    const cycle = await runCronCycle(page);
    expect(cycle.tiles).toMatchObject({ completed: 1, errors: [] });
    return cycle;
  }

  test.afterEach(async ({ page }) => {
    await mockTilerControl(page, { reset: true });
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    if (user) await cleanupTestUser(user.id);
    user = undefined;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("asking saves with the flag set", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);

    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: true });
    await page.reload();
    await expect(page.getByRole("status")).toHaveText(CONFIRMED);
  });

  test("a bake with features clears the flag", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);

    // The saved row is cataloged, so the cron itself refreshes and submits
    await mockTilerControl(page, { overpassEmpty: false });
    await page.goto("about:blank");
    const before = await tilesJobId(datasetId);
    await waitPastJobSecond(before);
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { lastAttempted: new Date(Date.now() - MORE_THAN_A_DAY_MS) },
    });
    expect(await runCronCycle(page)).toMatchObject({ successful: 1 });
    const jobId = await tilesJobId(datasetId);
    expect(jobId).not.toBe(before);

    await mockTilerControl(page, { jobId, state: "done" });
    const cycle = await runCronCycle(page);
    expect(cycle).toMatchObject({ totalFound: 0, tiles: { completed: 1 } });
    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: false });
  });

  test("unsaving first leaves nothing to send", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);
    await page.getByRole("button", { name: "Unsave" }).click();
    await expect(notifyButton(page)).toBeVisible();
    expect(await readSave(datasetId)).toBeNull();

    await mockTilerControl(page, { overpassEmpty: false });
    const cycle = await landBake(page, datasetId);

    expect(cycle.errors).toEqual([]);
    expect(await readSave(datasetId)).toBeNull();
  });

  test("a bake that is still empty keeps the flag", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);

    // Overpass stays empty too, as it would: the row's own count is 0, so
    // the tiler's zero only backs it up
    await landBake(page, datasetId, { ...fixtureStats, features: 0 });

    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: true });
  });
});
