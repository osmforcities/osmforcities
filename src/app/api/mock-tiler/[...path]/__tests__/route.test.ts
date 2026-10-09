import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "../route";
import { mockTilerState, resetMockTiler } from "@/lib/mocks/tiler";
import { tilerStatsToDatasetColumns } from "@/lib/tiler/stats";

const req = (path: string[], body?: unknown) => [
  new NextRequest(`http://localhost/api/mock-tiler/${path.join("/")}`, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  { params: Promise.resolve({ path }) },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetMockTiler();
});

describe("/api/mock-tiler", () => {
  it("answers 404 everywhere when test auth is off", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "false");
    expect((await GET(...req(["status"]))).status).toBe(404);
    expect((await POST(...req(["control"], { reset: true }))).status).toBe(404);
    expect((await POST(...req(["jobs"], { id: "j1" }))).status).toBe(404);
  });

  it("takes a bake from submit through reconcile downloads to ack", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    expect((await GET(...req(["status"]))).status).toBe(200);
    expect((await GET(...req(["jobs", "j1"]))).status).toBe(404);

    expect((await POST(...req(["jobs"], { id: "j1", query: "q" }))).status).toBe(202);
    expect(await (await GET(...req(["jobs", "j1"]))).json()).toEqual({
      id: "j1",
      state: "queued",
    });

    await POST(...req(["control"], { jobId: "j1", state: "baking", progress: { stage: "baking", pct: 40 } }));
    expect(await (await GET(...req(["jobs", "j1"]))).json()).toMatchObject({
      state: "baking",
      progress: { pct: 40 },
    });

    await POST(...req(["control"], { jobId: "j1", state: "done" }));
    const archive = await GET(...req(["jobs", "j1", "output.pmtiles"]));
    expect(archive.status).toBe(200);
    expect(Buffer.from(await archive.arrayBuffer()).subarray(0, 7).toString()).toBe("PMTiles");
    const stats = await GET(...req(["jobs", "j1", "stats.json"]));
    // Fixture stays valid for the reconcile that reads it
    expect(tilerStatsToDatasetColumns(await stats.json())).not.toBeNull();

    expect((await DELETE(...req(["jobs", "j1"]))).status).toBe(204);
    expect((await GET(...req(["jobs", "j1"]))).status).toBe(404);
  });

  it("forgets a bake on control missing, and sets the Overpass count", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    await POST(...req(["jobs"], { id: "j2" }));
    await POST(...req(["control"], { jobId: "j2", missing: true }));
    expect((await GET(...req(["jobs", "j2"]))).status).toBe(404);

    await POST(...req(["control"], { overpassCount: 60000 }));
    expect(mockTilerState().overpassCount).toBe(60000);
  });
});
