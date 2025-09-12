// Test setup that applies global mocks to all tests
/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, Page } from "@playwright/test";
import { setupGlobalApiMocks } from "./mocks/external-apis";

// Extend the base test to automatically setup mocks
export const test = base.extend<object, { page: Page }>({
  page: async ({ page }, use) => {
    setupGlobalApiMocks(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
