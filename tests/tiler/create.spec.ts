import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";

// Amsterdam, with a template no chromium spec creates there
const AREA_ID = 271110;
const TEMPLATE_ID = "fountains";
// Over the 25 MB cap at 500 B per element: the tiles-only lane
const OVER_CAP_COUNT = 60_000;

test.describe("Tiles-only dataset creation", () => {
  let user: TestUser;

  test.afterEach(async ({ page }) => {
    await page.request.post("/api/mock-tiler/control", { data: { reset: true } });
    if (user) await cleanupTestUser(user.id);
  });

  test("goes from processing to a map served from tiles", async ({ page }) => {
    const control = (data: object) =>
      page.request.post("/api/mock-tiler/control", { data });

    expect((await control({ reset: true })).ok()).toBe(true);
    await control({ overpassCount: OVER_CAP_COUNT });

    const prisma = new PrismaClient();
    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    await page.goto(`/en/area/${AREA_ID}/dataset/${TEMPLATE_ID}`);
    const panel = page.getByTestId("tiles-processing-panel");
    await expect(panel).toBeVisible();

    const { tilesJobId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AREA_ID, templateId: TEMPLATE_ID },
      select: { tilesJobId: true },
    });
    await prisma.$disconnect();
    expect(tilesJobId).toBeTruthy();

    await control({
      jobId: tilesJobId,
      state: "baking",
      progress: { stage: "baking", pct: 40 },
    });
    await expect(panel).toContainText("Baking map tiles (40%)");

    // The panel's tiles-status poll reconciles the done job, then the page
    // refreshes and the map reads the pulled archive
    const archive = page.waitForResponse((response) =>
      response.url().includes(`/api/tiles/${tilesJobId}.pmtiles`)
    );
    await control({ jobId: tilesJobId, state: "done" });
    expect((await archive).ok()).toBe(true);
    await expect(panel).toBeHidden();
  });
});
