import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { GET } from "../route";

function makeRequest(id: string, search = "") {
  return new NextRequest(
    `http://localhost:3000/api/datasets/${id}/geojson${search}`
  );
}

type Coordinates = number | Coordinates[];

function collectNumbers(coords: Coordinates, out: number[] = []): number[] {
  if (typeof coords === "number") {
    out.push(coords);
  } else {
    coords.forEach((c) => collectNumbers(c, out));
  }
  return out;
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

  it("should return a slim payload for ?slim", async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: true },
    });

    const response = await GET(makeRequest(testDatasetId, "?slim"), {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/geo+json");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=300, stale-while-revalidate=3600"
    );

    const body = await response.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features.length).toBeGreaterThan(0);

    for (const feature of body.features) {
      // Only the age-bucketing timestamp survives; all OSM tags dropped
      const keys = Object.keys(feature.properties);
      expect(
        keys.every((key) => key === "@timestamp"),
        `unexpected properties: ${keys.join(", ")}`
      ).toBe(true);

      // Geometry preserved with coordinates truncated to 6 decimals
      expect(feature.geometry).toBeDefined();
      for (const value of collectNumbers(feature.geometry.coordinates)) {
        expect(value).toBe(Math.round(value * 1e6) / 1e6);
      }
    }
  });

  it("should return full properties without slim param", async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: true },
    });

    const response = await GET(makeRequest(testDatasetId), {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    // Full payload keeps OSM metadata beyond @timestamp (e.g. @id, tags)
    const hasExtraProps = body.features.some(
      (feature: { properties: Record<string, unknown> }) =>
        Object.keys(feature.properties).some((key) => key !== "@timestamp")
    );
    expect(hasExtraProps).toBe(true);
  });

  it("should return 404 for ?slim on a non-featured dataset", async () => {
    await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: false },
    });

    const response = await GET(makeRequest(testDatasetId, "?slim"), {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(404);
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
