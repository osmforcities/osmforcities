import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Same .env.test the servers load, so specs read secrets instead of copying them
loadEnvConfig(process.cwd());

// Opt-in, run by hand: the :3100 server talks to a real overpass-pmtiler
// checkout instead of its mock tiler (tests/tiler/smoke.spec.ts)
const pmtilerSmoke = process.env.PMTILER_SMOKE === "1";
const PMTILER_SMOKE_PORT = 8199; // off the tiler's default 8099
if (pmtilerSmoke && !process.env.PMTILER_DIR) {
  throw new Error("PMTILER_SMOKE=1 needs PMTILER_DIR (an overpass-pmtiler checkout)");
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 1 worker everywhere: cleanupTestUser (tests/utils/auth.ts) deletes ALL
  // unsaved datasets (datasets have no creator to scope by), so concurrent
  // workers delete each other's freshly-created test data. CI parallelism
  // comes from the 2-shard matrix in .github/workflows/tests.yml instead.
  workers: 1,
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
      // A running :3100 points at the mock tiler
      reuseExistingServer: !pmtilerSmoke,
      timeout: 120 * 1000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NEXT_DIST_DIR: ".next-tiler",
        OVERPASS_API_URL: "http://localhost:3100/api/mock-overpass",
        TILER_URL: pmtilerSmoke
          ? `http://127.0.0.1:${PMTILER_SMOKE_PORT}`
          : "http://localhost:3100/api/mock-tiler",
        NEXT_PUBLIC_TILES_ENABLED: "true",
        TILES_DIR: "./data/tiles-test", // data/ is gitignored
        ...(pmtilerSmoke && {
          MOCK_OVERPASS_DATA_FILE: `${process.env.PMTILER_DIR}/fixtures/delft-parks.json`,
        }),
      },
    },
    ...(pmtilerSmoke
      ? [
          {
            // Fetches from the :3100 mock Overpass: no tunnel, no live OSM
            command: `python3 "${process.env.PMTILER_DIR}/pmtiler.py"`,
            url: `http://127.0.0.1:${PMTILER_SMOKE_PORT}/status`,
            stdout: "pipe" as const,
            env: {
              PMTILER_PORT: String(PMTILER_SMOKE_PORT),
              PMTILER_SPOOL: "./data/pmtiler-smoke-spool",
              PMTILER_OVERPASS: "http://localhost:3100/api/mock-overpass",
            },
          },
        ]
      : []),
  ],
  globalSetup: require.resolve("./tests/global-setup.ts"),
  testMatch: "**/*.spec.ts",
});
