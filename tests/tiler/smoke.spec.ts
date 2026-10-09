import { test, expect } from "../test-setup";
import { PrismaClient } from "@prisma/client";
import { DatasetStatsSchema } from "../../src/schemas/dataset";
import {
  cleanupTestUser,
  createTestUser,
  setupAuthenticationWithLogin,
  TestUser,
} from "../utils/auth";
import { AMSTERDAM, mockTilerControl, OVER_CAP_COUNT } from "../utils/tiler";

const TEMPLATE_ID = "parks";
// PMTiles v3 header: magic "PMTiles", then the spec version byte
const PMTILES_V3 = Buffer.from([...Buffer.from("PMTiles"), 3]);

// Contract check against a real overpass-pmtiler: job JSON, stats.json and
// archive format. The tiler bakes Delft parks whatever the area, so the map
// stays on Amsterdam, but the archive is read all the same.
test.describe("Real tiler smoke", () => {
  test.skip(
    process.env.PMTILER_SMOKE !== "1",
    "Opt-in: PMTILER_SMOKE=1 with an overpass-pmtiler checkout at PMTILER_DIR"
  );
  test.setTimeout(3 * 60 * 1000);

  const prisma = new PrismaClient();
  let user: TestUser;

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

  test("bakes a real archive and fills stats from stats.json", async ({
    page,
  }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });
    await mockTilerControl(page, { realOverpassData: true });

    user = await createTestUser(prisma);
    await setupAuthenticationWithLogin(page, user);

    // Listen before the page opens: a small bake can land within seconds
    const archive = page.waitForResponse(
      (response) =>
        response.url().includes("/api/tiles/") &&
        response.url().endsWith(".pmtiles"),
      { timeout: 2 * 60 * 1000 }
    );
    await page.goto(`/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`);

    const { id, tilesJobId } = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true, tilesJobId: true },
    });
    expect(tilesJobId).toBeTruthy();

    const served = await archive;
    expect(served.ok()).toBe(true);
    expect(served.url()).toContain(`/api/tiles/${tilesJobId}.pmtiles`);

    const full = await page.request.get(`/api/tiles/${tilesJobId}.pmtiles`);
    expect(full.status()).toBe(200);
    expect((await full.body()).subarray(0, 8)).toEqual(PMTILES_V3);

    const row = await prisma.dataset.findUniqueOrThrow({ where: { id } });
    expect(row.tilesServedJobId).toBe(tilesJobId);
    expect(row.dataCount).toBeGreaterThan(0);
    // The count probe's number, if stats.json never landed
    expect(row.dataCount).not.toBe(OVER_CAP_COUNT);
    DatasetStatsSchema.parse(row.stats); // throws with the failing fields
  });
});
