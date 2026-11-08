import type { Page } from "@playwright/test";
import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import { AMSTERDAM, mockTilerControl, OVER_CAP_COUNT } from "../utils/tiler";

// Not used by any other spec
const TEMPLATE_ID = "post-boxes";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
const CONFIRMED = /You'll get an email when the map is ready/;

test.describe("First visit to a dataset on the tiles-only lane", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  const readDataset = () =>
    prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true, tilesJobId: true, tilesState: true },
    });

  const readSave = (datasetId: string) =>
    prisma.datasetSave.findUnique({
      where: { userId_datasetId: { userId: user.id, datasetId } },
      select: { notifyWhenReady: true },
    });

  async function saveWhileCounting(page: Page) {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });
    await mockTilerControl(page, { countHeld: true });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);

    const counting = page.getByTestId("dataset-counting-page");
    await expect(counting).toContainText("Calculating size");
    await counting
      .getByRole("button", { name: /Save it and get an email when it's ready/ })
      .click();
    await expect(page.getByRole("status")).toContainText(CONFIRMED);

    const dataset = await readDataset();
    expect(dataset.tilesState).toBe("counting");
    expect(await readSave(dataset.id)).toEqual({ notifyWhenReady: true });
    return dataset.id;
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

  test("goes from counting to baking in place, and a save made while counting gets the ready mail", async ({
    page,
  }) => {
    const datasetId = await saveWhileCounting(page);

    let reloaded = false;
    page.on("load", () => (reloaded = true));
    await mockTilerControl(page, { countHeld: false });
    const baking = page.getByTestId("dataset-baking-page");
    await expect(baking).toContainText("Waiting for a free slot");
    await expect(page.getByRole("status")).toContainText(CONFIRMED);

    const { tilesJobId } = await readDataset();
    await mockTilerControl(page, {
      jobId: tilesJobId,
      state: "fetching",
      progress: { stage: "fetching", bytes: 2 * 1024 * 1024 },
    });
    await expect(baking).toContainText("2 MB");

    await mockTilerControl(page, { jobId: tilesJobId, state: "done" });
    await expect(baking).toBeHidden();
    expect(reloaded).toBe(false);
    // The tiler server runs with EMAIL_DISABLE: a sent mail clears the flag
    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: false });
  });

  test("a save made while counting on a too-large area keeps its offer alive", async ({
    page,
  }) => {
    const datasetId = await saveWhileCounting(page);

    await mockTilerControl(page, { countHeld: false });
    await expect(page.getByTestId("dataset-baking-page")).toBeVisible();
    const { tilesJobId } = await readDataset();
    await mockTilerControl(page, {
      jobId: tilesJobId,
      state: "failed",
      errorKind: "too_large",
      error: "query exceeds maxsize",
    });

    await expect(page.getByText("Too large to bake.")).toBeVisible();
    await expect(page.getByRole("status")).toContainText(CONFIRMED);
    expect(await readSave(datasetId)).toEqual({ notifyWhenReady: true });
  });

  test("a timed-out count reaches the timed-out screen, which still offers saving", async ({
    page,
  }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { countTimesOut: true });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);
    await page.goto(PAGE);

    const timedOut = page.getByTestId("dataset-timedOut-page");
    await expect(timedOut).toContainText("The data took too long to load.");
    await expect(
      timedOut.getByRole("button", { name: /Save it and get an email when it's ready/ })
    ).toBeVisible();
    expect(await readDataset()).toMatchObject({ tilesState: "counting" });
  });
});
