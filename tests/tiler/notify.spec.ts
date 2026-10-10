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
  runCronCycle,
  waitPastJobSecond,
} from "../utils/tiler";
import fixtureStats from "../../src/lib/mocks/tiler/stats.json";

// Not used by any other spec, so no verdict or row is shared
const TEMPLATE_ID = "give-box";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;

// The tiler server runs with EMAIL_DISABLE, but a sent mail still clears the
// save's flag, so the flag is what these tests watch
test.describe("Save and email me when the map is ready", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  const readSave = (datasetId: string) =>
    prisma.datasetSave.findUnique({
      where: { userId_datasetId: { userId: user.id, datasetId } },
      select: { notifyWhenReady: true },
    });

  /**
   * Opens the empty dataset as an admin (Sync is how a bake lands below) and
   * presses the save-and-notify button. The page is left afterwards so it
   * cannot reconcile ahead of the cycle under test.
   */
  async function optInOnEmptyDataset(page: Page) {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassEmpty: true });

    user = await createTestUser(prisma, { isAdmin: true });
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);
    await page
      .getByRole("button", { name: "Save and email me if it gets mapped" })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Saved. You'll get an email when the map is ready."
    );

    const { id } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true },
    });
    return id;
  }

  /**
   * Sync submits a fresh bake, the mock finishes it, and one cron cycle
   * reconciles it. Sync sets lastAttempted, so the cycle refreshes nothing.
   */
  async function landBake(page: Page, datasetId: string, stats?: object) {
    const before = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { tilesJobId: true },
    });
    await waitPastJobSecond(before.tilesJobId as string);
    const sync = await page.request.post(`/api/datasets/${datasetId}/refresh`);
    expect(sync.ok()).toBe(true);
    await page.goto("about:blank");

    const { tilesJobId } = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { tilesJobId: true },
    });
    expect(tilesJobId).not.toBe(before.tilesJobId);
    await mockTilerControl(page, { jobId: tilesJobId, state: "done", stats });

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
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("the empty state saves with the email request", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);

    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: true });
    await page.reload();
    await expect(page.getByRole("status")).toHaveText(
      "Saved. You'll get an email when the map is ready."
    );
  });

  test("a bake with features clears the email request", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);

    await mockTilerControl(page, { overpassEmpty: false });
    await landBake(page, datasetId);

    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: false });
  });

  test("unsaving first leaves nothing to send", async ({ page }) => {
    const datasetId = await optInOnEmptyDataset(page);
    await page.getByRole("button", { name: "Unsave" }).click();
    await expect(
      page.getByRole("button", { name: "Save and email me if it gets mapped" })
    ).toBeVisible();
    expect(await readSave(datasetId)).toBeNull();

    await mockTilerControl(page, { overpassEmpty: false });
    const cycle = await landBake(page, datasetId);

    expect(cycle.errors).toEqual([]);
    expect(await readSave(datasetId)).toBeNull();
  });

  test("a bake that is still empty keeps the email request", async ({
    page,
  }) => {
    const datasetId = await optInOnEmptyDataset(page);

    await landBake(page, datasetId, { ...fixtureStats, features: 0 });

    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: true });
  });
});
