import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 30 * 1000, // 30 seconds for expect assertions to find actual bugs
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
    command: "NODE_ENV=test ENABLE_PASSWORD_AUTH=true pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
  globalSetup: require.resolve("./tests/global-setup.ts"),
});
