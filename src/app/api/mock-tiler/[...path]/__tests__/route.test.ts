import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "../route";
import { POST as overpass } from "@/app/api/mock-overpass/route";
import { resetMockTiler } from "@/lib/mocks/tiler";
import { tilerStatsToDatasetColumns } from "@/lib/tiler/stats";
import { ndjsonToFeatureCollection } from "@/lib/tiler/features";

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
    const ndjson = await GET(...req(["jobs", "j1", "data.ndjson"]));
    expect(ndjsonToFeatureCollection(await ndjson.text()).features).toHaveLength(1);

    expect((await DELETE(...req(["jobs", "j1"]))).status).toBe(204);
    expect((await GET(...req(["jobs", "j1"]))).status).toBe(404);
  });

  it("serves a job's own stats when control sets them", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    const stats = { schemaVersion: 1, features: 150 };
    await POST(...req(["control"], { jobId: "j1", state: "done", stats }));
    await POST(...req(["control"], { jobId: "j2", state: "done" }));

    expect(await (await GET(...req(["jobs", "j1", "stats.json"]))).json()).toEqual(stats);
    expect(await (await GET(...req(["jobs", "j1"]))).json()).toEqual({ id: "j1", state: "done" });
    // Jobs without their own keep the fixture
    expect((await (await GET(...req(["jobs", "j2", "stats.json"]))).json()).features).toBe(2);
  });

  it("fails submits and pings on the outage switches until reset", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    await POST(...req(["control"], { submitFails: true }));
    expect((await POST(...req(["jobs"], { id: "j1", query: "q" }))).status).toBe(500);
    expect((await GET(...req(["jobs", "j1"]))).status).toBe(404);

    await POST(...req(["control"], { tilerDown: true }));
    expect((await GET(...req(["status"]))).status).toBe(503);

    await POST(...req(["control"], { reset: true }));
    expect((await GET(...req(["status"]))).status).toBe(200);
    expect((await POST(...req(["jobs"], { id: "j1", query: "q" }))).status).toBe(202);
  });

  it("sets the count mock-overpass answers to count probes", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    const countProbe = () =>
      overpass(
        new NextRequest("http://localhost/api/mock-overpass", {
          method: "POST",
          body: `data=${encodeURIComponent("node(1);out count;")}`,
        })
      ).then((res) => res.json());

    expect((await countProbe()).elements[0].tags.total).toBe("1");
    await POST(...req(["control"], { overpassCount: 60000 }));
    expect((await countProbe()).elements[0].tags.total).toBe("60000");
  });

  it("times out count probes on the switch and counts every probe", async () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    const countProbe = () =>
      overpass(
        new NextRequest("http://localhost/api/mock-overpass", {
          method: "POST",
          body: `data=${encodeURIComponent("node(1);out count;")}`,
        })
      );

    await POST(...req(["control"], { countTimesOut: true }));
    expect((await countProbe()).status).toBe(504);
    expect((await countProbe()).status).toBe(504);
    expect(await (await GET(...req(["control"]))).json()).toEqual({
      countProbes: 2,
    });

    await POST(...req(["control"], { reset: true }));
    expect((await countProbe()).status).toBe(200);
  });
});
