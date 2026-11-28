import type { FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  // A real tiler fetches its features from the mock Overpass
  if (process.env.PMTILER_SMOKE === "1") return;

  for (const project of config.projects) {
    const serverStarted =
      !process.env.E2E_PROJECT || process.env.E2E_PROJECT === project.name;
    if (!serverStarted) continue;

    const server = project.use.baseURL;
    const response = await fetch(`${server}/api/mock-tiler/control`);
    if (!response.ok) {
      throw new Error(
        `${server} has no mock Overpass to read (HTTP ${response.status}). Is another dev server on that port?`
      );
    }
    const { featureFetches } = await response.json();
    if (featureFetches !== 0) {
      throw new Error(
        `The app fetched dataset features from Overpass ${featureFetches} time(s) on ${server}. Only the tiler fetches features. A reused dev server keeps the count until it restarts.`
      );
    }
  }
}

export default globalTeardown;
