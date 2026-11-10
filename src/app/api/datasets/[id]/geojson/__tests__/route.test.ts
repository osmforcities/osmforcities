import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn() } },
}));

import { GET } from "../route";

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

const properties = {
  "@id": "way/1",
  "@timestamp": "2020-01-01T00:00:00Z",
  building: "house",
  name: "A",
};

const datasetRow = (isFeatured: boolean, defaultView: string | null) => ({
  isFeatured,
  geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1.23456789, -9.87654321] },
        properties,
      },
    ],
  },
  template: { defaultView },
});

const datasetsById = new Map<string, ReturnType<typeof datasetRow>>();

function findDataset({
  where,
}: {
  where: { id: string; isFeatured?: boolean };
}) {
  const row = datasetsById.get(where.id);
  const matches =
    row && (where.isFeatured === undefined || row.isFeatured === where.isFeatured);
  return Promise.resolve(matches ? row : null);
}

const call = (id: string, search = "") =>
  GET(
    new NextRequest(`http://localhost:3000/api/datasets/${id}/geojson${search}`),
    { params: Promise.resolve({ id }) }
  );

describe("GET /api/datasets/[id]/geojson", () => {
  beforeEach(() => {
    datasetsById.clear();
    datasetsById.set("featured", datasetRow(true, "building"));
    datasetsById.set("no-view", datasetRow(true, null));
    datasetsById.set("not-featured", datasetRow(false, "building"));
    vi.mocked(prisma.dataset.findUnique).mockImplementation(
      findDataset as never
    );
  });

  it("returns the full geojson with cache headers for a featured dataset", async () => {
    const res = await call("featured");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/geo+json");
    expect(res.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
    const body = await res.json();
    expect(body.features[0].properties).toEqual(properties);
    expect(body.features[0].geometry.coordinates).toEqual([
      1.23456789, -9.87654321,
    ]);
  });

  it("?slim keeps the timestamp and default view tag, truncates coordinates", async () => {
    const res = await call("featured", "?slim");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/geo+json");
    expect(res.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
    const [feature] = (await res.json()).features;
    expect(feature.properties).toEqual({
      "@timestamp": properties["@timestamp"],
      building: "house",
    });
    expect(feature.geometry.coordinates).toEqual([1.234568, -9.876543]);
  });

  it("?slim keeps only the timestamp without a default view", async () => {
    const res = await call("no-view", "?slim");

    expect((await res.json()).features[0].properties).toEqual({
      "@timestamp": properties["@timestamp"],
    });
  });

  it.each(["", "?slim"])(
    "returns 404 for a non-featured dataset (%s)",
    async (search) => {
      const res = await call("not-featured", search);

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("Dataset or GeoJSON not found");
    }
  );

  it("returns 404 for a missing dataset", async () => {
    const res = await call("missing");

    expect(res.status).toBe(404);
  });
});
