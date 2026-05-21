import { test, expect } from "./test-setup";
import { createTestUser, setupAuthenticationWithLogin, cleanupTestUser } from "./utils/auth";
import { PrismaClient } from "@prisma/client";

test.describe("Dataset Template Translations", () => {
  test.describe.configure({ mode: "serial" });
  const areaId = "298470"; // Test area
  const templateId = "bicycle-parking";

  test("shows English template name on /en/ locale", async ({ page }) => {
    const prisma = new PrismaClient();
    const testUser = await createTestUser(prisma, { language: "en" });
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, testUser);

    await page.goto(`/en/area/${areaId}/dataset/${templateId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("[data-testid='breadcrumb-nav']").getByText("Bicycle Parking")).toBeVisible();

    await cleanupTestUser(testUser.id);
  });

  test("shows Portuguese template name on /pt-BR/ locale", async ({ page }) => {
    const prisma = new PrismaClient();
    const ptUser = await createTestUser(prisma, { language: "pt-BR" });
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, ptUser);

    await page.goto(`/pt-BR/area/${areaId}/dataset/${templateId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("[data-testid='breadcrumb-nav']").getByText("Estacionamento para bicicletas")).toBeVisible();

    await cleanupTestUser(ptUser.id);
  });

  test("shows Spanish template name on /es/ locale", async ({ page }) => {
    const prisma = new PrismaClient();
    const esUser = await createTestUser(prisma, { language: "es" });
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, esUser);

    await page.goto(`/es/area/${areaId}/dataset/${templateId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("[data-testid='breadcrumb-nav']").getByText("Estacionamiento de bicicletas")).toBeVisible();

    await cleanupTestUser(esUser.id);
  });
});
