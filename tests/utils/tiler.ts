import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export const AMSTERDAM = 271110;
// Over the 25 MB cap at 500 B per element
export const OVER_CAP_COUNT = 60_000;

export const mockTilerControl = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

/** Queries the mock Overpass answered since the last reset. */
const overpassCalls = async (
  page: Page
): Promise<{ countProbes: number; featureFetches: number }> =>
  (await page.request.get("/api/mock-tiler/control")).json();

export const countProbes = async (page: Page) =>
  (await overpassCalls(page)).countProbes;

export const featureFetches = async (page: Page) =>
  (await overpassCalls(page)).featureFetches;

export const archiveRequest = (page: Page, jobId: string) =>
  page.waitForResponse((response) =>
    response.url().includes(`/api/tiles/${jobId}.pmtiles`)
  );

/** One update-datasets cycle: refresh due rows, then reconcile pending bakes. */
export async function runCronCycle(page: Page) {
  const response = await page.request.post("/api/tasks/update-datasets", {
    headers: { Authorization: `Bearer ${process.env.CRON_ROUTE_SECRET}` },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}

// Job ids end in the Unix second: a bake submitted in the same second reuses
// the id
export async function waitPastJobSecond(jobId: string) {
  const submittedAt = Number(jobId.split("-").pop());
  await expect
    .poll(() => Math.floor(Date.now() / 1000))
    .toBeGreaterThan(submittedAt);
}

/** Lands the first mock bake so the page shows the map, not the wait page. */
export async function openMappedDataset(
  page: Page,
  areaId: number,
  templateId: string,
  locale = "en"
) {
  await page.goto(`/${locale}/area/${areaId}/dataset/${templateId}`);
  const prisma = new PrismaClient();
  try {
    const where = { areaId, templateId, isActive: true };
    const served = await prisma.dataset.findFirst({
      where: { ...where, tilesServedJobId: { not: null } },
    });
    if (served) return;
    let jobId: string | null = null;
    await expect
      .poll(async () => {
        const row = await prisma.dataset.findFirst({
          where: { ...where, tilesState: "pending" },
          select: { tilesJobId: true },
        });
        jobId = row?.tilesJobId ?? null;
        return jobId;
      })
      .toBeTruthy();
    await mockTilerControl(page, { jobId, state: "done" });
    await expect(page.getByTestId("dataset-baking-page")).toBeHidden();
  } finally {
    await prisma.$disconnect();
  }
}
