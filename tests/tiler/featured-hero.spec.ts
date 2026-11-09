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
  archiveRequest,
  mockTilerControl,
  OVER_CAP_COUNT,
} from "../utils/tiler";
import fixtureStats from "../../src/lib/mocks/tiler/stats.json";

// defaultView: cuisine
const TEMPLATE_ID = "restaurants";
const PAGE = `/en/area/${AMSTERDAM}/dataset/${TEMPLATE_ID}`;
const HERO_CARD = { name: /— View dataset$/ };

test.describe("Homepage hero on the tiles lane", () => {
  test.describe.configure({ mode: "serial" });

  const prisma = new PrismaClient();
  let admin: TestUser;
  let datasetId: string;
  let jobId: string;

  const toggleFeatured = async (page: Page) => {
    const response = await page.request.put(`/api/datasets/${datasetId}/feature`);
    expect(response.ok()).toBe(true);
    return (await response.json()).isFeatured as boolean;
  };

  test.beforeEach(async ({ page }) => {
    if (admin) await setupAuthenticationWithLogin(page, admin);
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await mockTilerControl(page, { reset: true });
    await page.close();
    await prisma.areaSizeCheck.deleteMany({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
    });
    if (admin) await cleanupTestUser(admin.id);
    await prisma.$disconnect();
  });

  test("skips a featured dataset whose first bake is pending", async ({ page }) => {
    expect((await mockTilerControl(page, { reset: true })).ok()).toBe(true);
    // Over the geojson cap: the archive is the only thing the hero can draw
    await mockTilerControl(page, { overpassCount: OVER_CAP_COUNT });

    admin = await createAdminTestUser(prisma);
    await setupAuthenticationWithLogin(page, admin);
    await page.goto(PAGE);
    await expect(page.getByTestId("dataset-baking-page")).toBeVisible();

    const created = await prisma.dataset.findFirstOrThrow({
      where: { areaId: AMSTERDAM, templateId: TEMPLATE_ID },
      select: { id: true, tilesJobId: true },
    });
    datasetId = created.id;
    jobId = created.tilesJobId!;
    // Saved, so other specs' cleanupTestUser leaves it alone
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { savedBy: { create: { userId: admin.id } } },
    });
    expect(await toggleFeatured(page)).toBe(true);

    await page.goto("/en");
    await expect(page.getByRole("link", HERO_CARD)).toHaveCount(0);
  });

  test("draws the served archive with the template's opening theme", async ({
    page,
  }) => {
    await mockTilerControl(page, {
      jobId,
      state: "done",
      stats: {
        ...fixtureStats,
        features: OVER_CAP_COUNT,
        filterDimensions: [
          {
            key: "cuisine",
            kind: "tag",
            values: [
              { value: "pizza", count: 3 },
              { value: "italian", count: 2 },
            ],
            missing: 1,
          },
        ],
      },
    });
    expect(
      (await page.request.get(`/api/datasets/${datasetId}/tiles-status`)).ok()
    ).toBe(true);
    await expect
      .poll(
        async () =>
          (
            await prisma.dataset.findUniqueOrThrow({
              where: { id: datasetId },
              select: { tilesServedJobId: true },
            })
          ).tilesServedJobId
      )
      .toBe(jobId);
    // The landed bake does not bust the hero's cached query; a toggle does
    expect(await toggleFeatured(page)).toBe(false);
    expect(await toggleFeatured(page)).toBe(true);

    const geojsonRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/geojson")) geojsonRequests.push(request.url());
    });
    const archive = archiveRequest(page, jobId);
    await page.goto("/en");

    expect((await archive).ok()).toBe(true);
    await expect(page.getByRole("link", HERO_CARD)).toBeVisible();
    await expect(page.getByText("Cuisine", { exact: true })).toBeVisible();
    expect(geojsonRequests).toEqual([]);
  });
});
