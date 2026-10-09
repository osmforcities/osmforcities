import type { Page } from "@playwright/test";

export const mockTilerControl = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });

export const archiveRequest = (page: Page, jobId: string) =>
  page.waitForResponse((response) =>
    response.url().includes(`/api/tiles/${jobId}.pmtiles`)
  );
