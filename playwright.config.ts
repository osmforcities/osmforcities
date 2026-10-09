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
      testIgnore: "tiler/**",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      // Specs that need the tiles lane, against the :3100 server below. Same
      // test DB as chromium, so this relies on the 1 CI worker too.
      name: "tiler",
      testDir: "./tests/tiler",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3100",
        // Headless Chromium has no GPU: without software WebGL the map never
        // starts, so it never requests tiles
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
  ],
  webServer: [
    {
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
    {
      // Tiles lane on, pointed at its own mock tiler and mock Overpass: mock
      // state lives in this process's memory.
      command: "NODE_ENV=test ENABLE_TEST_AUTH=true pnpm dev -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: true,
      timeout: 120 * 1000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NEXT_DIST_DIR: ".next-tiler",
        OVERPASS_API_URL: "http://localhost:3100/api/mock-overpass",
        TILER_URL: "http://localhost:3100/api/mock-tiler",
        NEXT_PUBLIC_TILES_ENABLED: "true",
        TILES_DIR: "./data/tiles-test", // data/ is gitignored
      },
    },
  ],
  globalSetup: require.resolve("./tests/global-setup.ts"),
  testMatch: "**/*.spec.ts",
});
