import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.com", isAdmin: true },
  }),
}));

import { PUT } from "../route";

const TEST_AREA_ID = 999_002;

describe("PUT /api/datasets/[id]/feature", () => {
  let testDatasetId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    const area = await prisma.area.upsert({
      where: { id: TEST_AREA_ID },
      update: {},
      create: { id: TEST_AREA_ID, name: "Test Area (feature-route)" },
    });

    const template = await prisma.template.create({
      data: {
        name: "Test Template (feature-route)",
        overpassQuery: "[out:json]; node[amenity=bench]; out;",
        category: "test",
      },
    });
    testTemplateId = template.id;

    const dataset = await prisma.dataset.create({
      data: {
        templateId: template.id,
        cityName: "Test City",
        areaId: area.id,
        isFeatured: false,
      },
    });
    testDatasetId = dataset.id;
  });

  afterAll(async () => {
    if (testDatasetId) {
      await prisma.dataset.delete({ where: { id: testDatasetId } });
    }
    if (testTemplateId) {
      await prisma.template.delete({ where: { id: testTemplateId } });
    }
    await prisma.area.deleteMany({ where: { id: TEST_AREA_ID } });
  });

  it("should return 403 for non-admin users", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request(
      "http://localhost:3000/api/datasets/" + testDatasetId + "/feature",
      { method: "PUT" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("should return 404 for non-existent dataset", async () => {
    const request = new Request(
      "http://localhost:3000/api/datasets/invalid-id/feature",
      { method: "PUT" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Dataset not found");
  });

  it("should toggle isFeatured field successfully", async () => {
    const beforeUpdate = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
      select: { isFeatured: true },
    });

    const request = new Request(
      "http://localhost:3000/api/datasets/" + testDatasetId + "/feature",
      { method: "PUT" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: testDatasetId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isFeatured).toBe(!beforeUpdate?.isFeatured);
    expect(body.id).toBe(testDatasetId);
  });
});
