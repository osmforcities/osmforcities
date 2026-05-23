import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

describe("Dataset.isFeatured field", () => {
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

  it("should have isFeatured field on Dataset model", async () => {
    const dataset = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
    });

    expect(dataset).not.toBeNull();
    expect(dataset?.isFeatured).toBeDefined();
    expect(typeof dataset?.isFeatured).toBe("boolean");
  });

  it("should allow toggling isFeatured field", async () => {
    // Get current value
    const current = await prisma.dataset.findUnique({
      where: { id: testDatasetId },
      select: { isFeatured: true },
    });

    // Toggle to opposite
    const toggled = await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: !current?.isFeatured },
    });

    expect(toggled.isFeatured).toBe(!current?.isFeatured);

    // Toggle back
    const restored = await prisma.dataset.update({
      where: { id: testDatasetId },
      data: { isFeatured: current?.isFeatured ?? false },
    });

    expect(restored.isFeatured).toBe(current?.isFeatured ?? false);
  });
});
