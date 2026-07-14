import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { GET } from "../route";

function makeRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/datasets/${id}/geojson`);
}

describe("GET /api/datasets/[id]/geojson", () => {
  let testDatasetId: string;
  let originalIsFeaturedValue: boolean;

  beforeAll(async () => {
    const datasets = await prisma.dataset.findMany({
      where: { geojson: { not: Prisma.AnyNull } },
      take: 1,
      select: { id: true, isFeatured: true },
    });

    if (datasets.length === 0) {
      throw new Error("No datasets with geojson found in test database");
    }

    testDatasetId = datasets[0].id;
    originalIsFeaturedValue = datasets[0].isFeatured;
  });

  afterAll(async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: originalIsFeaturedValue },
    });
  });

  it("should return geojson with cache headers for a featured dataset", async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: true },
    });

    const response = await GET(makeRequest(testDatasetId), {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/geo+json");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=300, stale-while-revalidate=3600"
    );
    const body = await response.json();
    expect(body.type).toBe("FeatureCollection");
  });

  it("should return 404 for a non-featured dataset", async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: false },
    });

    const response = await GET(makeRequest(testDatasetId), {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Dataset or GeoJSON not found");
  });

  it("should return 404 for a non-existent dataset", async () => {
    const response = await GET(makeRequest("invalid-id"), {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(404);
  });
});
