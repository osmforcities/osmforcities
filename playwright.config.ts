import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 1 worker in CI: cleanupTestUser (tests/utils/auth.ts) deletes ALL unsaved
  // datasets, not just the caller's, so concurrent workers can delete each
  // other's freshly-created test data. Parallelism comes from the 2-shard
  // matrix in .github/workflows/tests.yml instead (2 runners, each serial).
  workers: process.env.CI ? 1 : 2,
  timeout: 60 * 1000,
  expect: {
    timeout: 30 * 1000,
  },
  use: {
    trace: "on-first-retry",
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "NODE_ENV=test ENABLE_TEST_AUTH=true pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      OVERPASS_API_URL: "http://localhost:3000/api/mock-overpass",
    },
  },
  globalSetup: require.resolve("./tests/global-setup.ts"),
  testMatch: "**/*.spec.ts",
});
