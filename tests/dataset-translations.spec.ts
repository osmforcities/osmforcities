import { test, expect } from "./test-setup";
import { createTestUser, setupAuthenticationWithLogin, cleanupTestUser } from "./utils/auth";
import { PrismaClient } from "@prisma/client";

// Locale resolution logic itself is unit-tested in
// src/lib/__tests__/template-locale.test.ts. This single E2E verifies that the
// selected locale is wired into the dataset route's rendered template name.

test.describe("Dataset Template Translations", () => {
  test.describe.configure({ mode: "serial" });
  const areaId = "298470"; // Test area
  const templateId = "bicycle-parking";

  test("shows localized template name for the user's locale", async ({ page }) => {
    const prisma = new PrismaClient();
    const ptUser = await createTestUser(prisma, { language: "pt-BR" });
    await prisma.$disconnect();
    await setupAuthenticationWithLogin(page, ptUser);

    await page.goto(`/pt-BR/area/${areaId}/dataset/${templateId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("dataset-template-name")).toContainText("Estacionamento para bicicletas");

    await cleanupTestUser(ptUser.id);
  });
});
