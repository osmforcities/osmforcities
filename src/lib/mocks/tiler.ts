import type { TileJob } from "@/lib/tiler/client";

/**
 * In-memory state behind /api/mock-tiler and /api/mock-overpass, set by
 * Playwright specs through POST /api/mock-tiler/control. On globalThis so
 * every route bundle shares one copy. Per process: a spec drives the server
 * it talks to, and that server points TILER_URL and OVERPASS_API_URL at
 * itself.
 */
type MockTilerState = {
  jobs: Map<string, TileJob>;
  /** stats.json per job; a job without one serves the fixture. */
  stats: Map<string, unknown>;
  /** Count answered to count probes; null keeps the fixture's own count. */
  overpassCount: number | null;
  /** Count probes answer 504, as Overpass does when one runs out of time. */
  countTimesOut: boolean;
  /** Count probes received, so a spec can tell a stored verdict was reused. */
  countProbes: number;
  /** Full queries answer with a real Overpass result, for a real tiler to bake. */
  realOverpassData: boolean;
  /** POST /jobs answers 500. */
  submitFails: boolean;
  /** GET /status answers 503. */
  tilerDown: boolean;
};

const store = globalThis as unknown as { mockTiler?: MockTilerState };

export function mockTilerState(): MockTilerState {
  store.mockTiler ??= {
    jobs: new Map(),
    stats: new Map(),
    overpassCount: null,
    countTimesOut: false,
    countProbes: 0,
    realOverpassData: false,
    submitFails: false,
    tilerDown: false,
  };
  return store.mockTiler;
}

export function resetMockTiler(): void {
  store.mockTiler = undefined;
}
