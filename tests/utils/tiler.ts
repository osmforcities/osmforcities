import { expect, type Page } from "@playwright/test";

export const AMSTERDAM = 271110;
// Over the 25 MB cap at 500 B per element: the tiles-only lane when it is on,
// the too-large screen when it is off
export const OVER_CAP_COUNT = 60_000;

export const mockTilerControl = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

/** Count probes the mock Overpass answered since the last reset. */
export const countProbes = async (page: Page): Promise<number> =>
  (await (await page.request.get("/api/mock-tiler/control")).json())
    .countProbes;

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
