/**
 * E2E tests for template deprecation
 */

import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  createTestUser,
  cleanupTestUser,
  setupAuthenticationWithLogin,
} from "./utils/auth";

test.describe("Template Deprecation", () => {
  test.describe.configure({ mode: "serial" });
  let testUser: { id: string; email: string; password?: string };

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("deprecated template route returns 404", async ({ page }) => {
    const prisma = new PrismaClient();

    try {
      // Create and sign in test user
      testUser = await createTestUser(prisma);
      await setupAuthenticationWithLogin(page, testUser);

      // Clean up
      await prisma.template.deleteMany({ where: { id: "test-deprecated" } });

      // Create a test category first
      const testCategory = await prisma.category.upsert({
        where: { slug: "test" },
        create: { id: "cat-test", name: "Test", slug: "test" },
        update: {},
      });

      // Create a deprecated template
      await prisma.template.create({
        data: {
          id: "test-deprecated",
          name: "Deprecated Template",
          description: "This template is deprecated",
          overpassQuery: 'node["amenity"](area.searchArea);',
          category: { connect: { id: testCategory.id } },
          tags: ["amenity"],
          isActive: true,
          deprecatesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Try to access the deprecated template route
      await page.goto("/area/3039/dataset/test-deprecated"); // SF area ID

      // Should show template not found error
      await expect(page.locator("text=Dataset Template Not Found")).toBeVisible();
    } finally {
      await prisma.template.deleteMany({ where: { id: "test-deprecated" } });
      await prisma.category.deleteMany({ where: { slug: "test" } });
      await prisma.$disconnect();
    }
  });

  test("deprecated template with a replacement redirects to it for the same area", async ({ page }) => {
    const prisma = new PrismaClient();
    const ids = ["test-replaced", "test-replacement"];

    try {
      testUser = await createTestUser(prisma);
      await setupAuthenticationWithLogin(page, testUser);
      await prisma.template.deleteMany({ where: { id: { in: ids } } });

      const testCategory = await prisma.category.upsert({
        where: { slug: "test" },
        create: { id: "cat-test", name: "Test", slug: "test" },
        update: {},
      });
      const base = {
        overpassQuery: 'node["amenity"](area.searchArea);',
        category: { connect: { id: testCategory.id } },
        tags: ["amenity"],
        isActive: true,
      };
      await prisma.template.create({
        data: { ...base, id: "test-replacement", name: "Replacement Template" },
      });
      await prisma.template.create({
        data: {
          ...base,
          id: "test-replaced",
          name: "Replaced Template",
          deprecatesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          replacedBy: { connect: { id: "test-replacement" } },
        },
      });

      await page.goto("/area/3039/dataset/test-replaced");

      await expect(page).toHaveURL(/\/area\/3039\/dataset\/test-replacement$/);
      await expect(page.locator("text=Dataset Template Not Found")).toHaveCount(0);
    } finally {
      await prisma.template.deleteMany({ where: { id: { in: ids } } });
      await prisma.category.deleteMany({ where: { slug: "test" } });
      await prisma.$disconnect();
    }
  });

  test("non-deprecated template route works normally", async ({ page }) => {
    const prisma = new PrismaClient();

    try {
      // Create and sign in test user
      testUser = await createTestUser(prisma);
      await setupAuthenticationWithLogin(page, testUser);

      // Create a test category first
      const testCategory = await prisma.category.upsert({
        where: { slug: "test" },
        create: { id: "cat-test", name: "Test", slug: "test" },
        update: {},
      });

      // Create a non-deprecated template
      await prisma.template.upsert({
        where: { id: "test-active" },
        create: {
          id: "test-active",
          name: "Active Template",
          description: "This template is active",
          overpassQuery: 'node["amenity"](area.searchArea);',
          category: { connect: { id: testCategory.id } },
          tags: ["amenity"],
          isActive: true,
        },
        update: {
          isActive: true,
          deprecatesAt: null,
        },
      });

      // Try to access the active template route
      await page.goto("/area/3039/dataset/test-active");

      // Should not show template not found error (may show other errors for area/data)
      const templateNotFound = page.locator("text=Dataset Template Not Found");
      const isVisible = await templateNotFound.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    } finally {
      await prisma.template.deleteMany({ where: { id: "test-active" } });
      await prisma.category.deleteMany({ where: { slug: "test" } });
      await prisma.$disconnect();
    }
  });
});
