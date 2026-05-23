import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PUT } from "../route";
import { prisma } from "@/lib/db";

describe("PUT /api/datasets/[id]/feature", () => {
  let testDatasetId: string;
  let originalIsFeaturedValue: boolean | undefined;

  beforeAll(async () => {
    // Find an existing dataset
    const datasets = await prisma.dataset.findMany({
      take: 1,
      select: { id: true, isFeatured: true },
    });

    if (datasets.length === 0) {
      throw new Error("No datasets found in test database");
    }

    testDatasetId = datasets[0].id;
    originalIsFeaturedValue = datasets[0].isFeatured;
  });

  afterAll(async () => {
    // Restore original value
    if (testDatasetId && originalIsFeaturedValue !== undefined) {
      await prisma.dataset.update({
        where: { id: testDatasetId },
        data: { isFeatured: originalIsFeaturedValue },
      });
    }
  });

  it("should return 403 for non-admin users", async () => {
    // Mock non-admin session
    const request = new Request("http://localhost:3000/api/datasets/" + testDatasetId + "/feature", {
      method: "PUT",
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("should return 404 for non-existent dataset", async () => {
    const request = new Request("http://localhost:3000/api/datasets/invalid-id/feature", {
      method: "PUT",
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Dataset not found");
  });

  it("should toggle isFeatured field successfully", async () => {
    // Get current value
    const beforeUpdate = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
      select: { isFeatured: true },
    });

    const request = new Request("http://localhost:3000/api/datasets/" + testDatasetId + "/feature", {
      method: "PUT",
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.isFeatured).toBe(!beforeUpdate?.isFeatured);
    expect(body.id).toBe(testDatasetId);
  });
});
