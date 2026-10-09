import type { Page } from "@playwright/test";

export const AMSTERDAM = 271110;
// Over the 25 MB cap at 500 B per element: the tiles-only lane when it is on,
// the too-large screen when it is off
export const OVER_CAP_COUNT = 60_000;

export const mockTilerControl = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

export const archiveRequest = (page: Page, jobId: string) =>
  page.waitForResponse((response) =>
    response.url().includes(`/api/tiles/${jobId}.pmtiles`)
  );
