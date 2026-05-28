import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

const TEST_AREA_ID = 999_001;

describe("Dataset.isFeatured field", () => {
  let testDatasetId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    const area = await prisma.area.upsert({
      where: { id: TEST_AREA_ID },
      update: {},
      create: { id: TEST_AREA_ID, name: "Test Area (is-featured)" },
    });

    const template = await prisma.template.create({
      data: {
        name: "Test Template (is-featured)",
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
