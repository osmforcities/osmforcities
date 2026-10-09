import type { Page } from "@playwright/test";

/** Drive the in-app mock tiler of the server the page talks to. */
export const controlMockTiler = (page: Page, data: object) =>
  page.request.post("/api/mock-tiler/control", { data });
