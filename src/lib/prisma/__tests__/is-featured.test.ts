import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

describe("Dataset.isFeatured field", () => {
  let testDatasetId: string;
  let originalIsFeaturedValue: boolean | undefined;

  beforeAll(async () => {
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
    if (testDatasetId && originalIsFeaturedValue !== undefined) {
      await prisma.dataset.update({
        where: { id: testDatasetId },
        data: { isFeatured: originalIsFeaturedValue },
      });
    }
  });

  it("should have isFeatured field on Dataset model", async () => {
    const dataset = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
    });

    expect(dataset).not.toBeNull();
    expect(dataset?.isFeatured).toBeDefined();
    expect(typeof dataset?.isFeatured).toBe("boolean");
  });

  it("should allow toggling isFeatured field", async () => {
    const current = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
      select: { isFeatured: true },
    });

    const toggled = await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: !current?.isFeatured },
    });

    expect(toggled.isFeatured).toBe(!current?.isFeatured);

    const restored = await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: current?.isFeatured ?? false },
    });

    expect(restored.isFeatured).toBe(current?.isFeatured ?? false);
  });
});
