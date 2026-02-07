import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    command: process.env.CI
      ? "ENABLE_TEST_AUTH=true pnpm start"
      : "ENABLE_TEST_AUTH=true pnpm dev",
    url: "http://localhost:3000/api/health",
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
