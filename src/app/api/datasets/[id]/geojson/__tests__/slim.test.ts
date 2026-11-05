import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn() } },
}));

import { GET } from "../route";

const call = (id: string, search = "") =>
  GET(new NextRequest(`http://localhost:3000/api/datasets/${id}/geojson${search}`), {
    params: Promise.resolve({ id }),
  });

const featuredDataset = (defaultView: string | null) => ({
  geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { "@timestamp": "2020-01-01T00:00:00Z", building: "house", name: "A" },
      },
    ],
  },
  template: { defaultView },
});

describe("GET /api/datasets/[id]/geojson?slim", () => {
  it("keeps the template's default view tag next to the timestamp", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValueOnce(
      featuredDataset("building") as never
    );

    const res = await call("ds-1", "?slim");

    expect(res.status).toBe(200);
    expect((await res.json()).features[0].properties).toEqual({
      "@timestamp": "2020-01-01T00:00:00Z",
      building: "house",
    });
  });

  it("keeps only the timestamp without a default view", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValueOnce(
      featuredDataset(null) as never
    );

    const res = await call("ds-1", "?slim");

    expect((await res.json()).features[0].properties).toEqual({
      "@timestamp": "2020-01-01T00:00:00Z",
    });
  });

  it("queries featured datasets only and 404s otherwise", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValueOnce(null);

    const res = await call("ds-2", "?slim");

    expect(res.status).toBe(404);
    const args = vi.mocked(prisma.dataset.findUnique).mock.lastCall![0];
    expect(args.where).toEqual({ id: "ds-2", isFeatured: true });
  });
});
