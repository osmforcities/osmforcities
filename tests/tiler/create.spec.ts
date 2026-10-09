import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import { controlMockTiler as control } from "../utils/mock-tiler";

// Amsterdam, with a template no chromium spec creates there
const AREA_ID = 271110;
const TEMPLATE_ID = "fountains";
// Over the 25 MB cap at 500 B per element: the tiles-only lane
const OVER_CAP_COUNT = 60_000;

test.describe("Tiles-only dataset creation", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

  // The over-cap verdict outlives the dataset and would steer a later spec on
  // the same area and template
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

  test("goes from bake to a map read from the archive", async ({ page }) => {
    expect((await control(page, { reset: true })).ok()).toBe(true);
    await control(page, { overpassCount: OVER_CAP_COUNT });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(`/en/area/${AREA_ID}/dataset/${TEMPLATE_ID}`);
    const panel = page.getByTestId("tiles-processing-panel");
    await expect(panel).toBeVisible();

    const { tilesJobId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
      select: { tilesJobId: true },
    });
    expect(tilesJobId).toBeTruthy();

    await control(page, {
      jobId: tilesJobId,
      state: "baking",
      progress: { stage: "baking", pct: 40 },
    });
    await expect(panel).toContainText("Baking map tiles (40%)");

    // The panel's tiles-status request reconciles the finished bake, then the
    // page refreshes and the map reads the archive
    const archive = page.waitForResponse((response) =>
      response.url().includes(`/api/tiles/${tilesJobId}.pmtiles`)
    );
    await control(page, { jobId: tilesJobId, state: "done" });
    expect((await archive).ok()).toBe(true);
    await expect(panel).toBeHidden();
  });
});
