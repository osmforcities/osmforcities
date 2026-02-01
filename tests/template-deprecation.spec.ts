/**
 * E2E tests for template deprecation
 */

import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("Template Deprecation", () => {
  test("deprecated template route returns 404", async ({ page }) => {
    const prisma = new PrismaClient();

    try {
      // Clean up
      await prisma.template.deleteMany({ where: { id: "test-deprecated" } });

      // Create a deprecated template
      await prisma.template.create({
        data: {
          id: "test-deprecated",
          name: "Deprecated Template",
          description: "This template is deprecated",
          overpassQuery: 'node["amenity"](area.searchArea);',
          category: "test",
          tags: ["amenity"],
          isActive: true,
          deprecatedAt: new Date(),
        },
      });

      // Try to access the deprecated template route
      await page.goto("/area/3039/dataset/test-deprecated"); // SF area ID

      // Should show template not found error
      await expect(page.locator("text=Template Not Found")).toBeVisible();
    } finally {
      await prisma.$disconnect();
    }
  });

  test("non-deprecated template route works normally", async ({ page }) => {
    const prisma = new PrismaClient();

    try {
      // Create a non-deprecated template
      await prisma.template.upsert({
        where: { id: "test-active" },
        create: {
          id: "test-active",
          name: "Active Template",
          description: "This template is active",
          overpassQuery: 'node["amenity"](area.searchArea);',
          category: "test",
          tags: ["amenity"],
          isActive: true,
        },
        update: {
          isActive: true,
          deprecatedAt: null,
        },
      });

      // Try to access the active template route
      await page.goto("/area/3039/dataset/test-active");

      // Should not show template not found error (may show other errors for area/data)
      const templateNotFound = page.locator("text=Template Not Found");
      const isVisible = await templateNotFound.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    } finally {
      await prisma.$disconnect();
    }
  });
});
