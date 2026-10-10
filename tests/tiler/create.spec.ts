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
} from "../utils/tiler";

const TEMPLATE_ID = "fountains";

test.describe("Tiles-only dataset creation", () => {
  const prisma = new PrismaClient();
  let user: TestUser;

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

  test("goes from bake to a map read from the archive", async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);
    const panel = page.getByTestId("tiles-processing-panel");
    await expect(panel).toBeVisible();

    const { tilesJobId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { tilesJobId: true },
    });
    expect(tilesJobId).toBeTruthy();

    await mockTilerControl(page, {
      jobId: tilesJobId,
      state: "baking",
      progress: { stage: "baking", pct: 40 },
    });
    await expect(panel).toContainText("Baking map tiles (40%)");

    // The panel's tiles-status request reconciles the finished bake, then the
    // page refreshes and the map reads the archive
    const archive = archiveRequest(page, String(tilesJobId));
    await mockTilerControl(page, { jobId: tilesJobId, state: "done" });
    expect((await archive).ok()).toBe(true);
    await expect(panel).toBeHidden();
  });

  test("an under-cap dataset stores no geojson and maps once its bake lands", async ({
    page,
  }) => {
    // The fixture's own count: well under the cap
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);
    const panel = page.getByTestId("tiles-processing-panel");
    await expect(panel).toBeVisible();

    const created = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true, geojson: true, tilesJobId: true },
    });
    expect(created.geojson).toBeNull();

    const archive = archiveRequest(page, String(created.tilesJobId));
    await mockTilerControl(page, { jobId: created.tilesJobId, state: "done" });
    expect((await archive).ok()).toBe(true);
    await expect(panel).toBeHidden();

    // The feature fill stores the bake's features for export
    const baked = await prisma.dataset.findUniqueOrThrow({
      where: { id: created.id },
      select: { geojson: true },
    });
    expect(baked.geojson).toMatchObject({ type: "FeatureCollection" });
  });
});
