import { test, expect } from "./test-setup";
import {
  createTestUser,
  createAdminTestUser,
  cleanupTestUser,
} from "./utils/auth";
import { PrismaClient } from "@prisma/client";

test.describe("Dashboard Tab Navigation", () => {
  let regularUser: { id: string; email: string; password?: string };
  let adminUser: { id: string; email: string; password?: string };

  test.beforeEach(async () => {
    const prisma = new PrismaClient();
    regularUser = await createTestUser(prisma);
    adminUser = await createAdminTestUser(prisma);
    await prisma.$disconnect();
  });

  test.afterEach(async () => {
    if (regularUser) {
      await cleanupTestUser(regularUser.id);
    }
    if (adminUser) {
      await cleanupTestUser(adminUser.id);
    }
  });

  test.describe("Tab Visibility", () => {
    test("should show only Following tab for regular users", async ({
      page,
    }) => {
      // Login as regular user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', regularUser.email);
      await page.fill('input[name="password"]', regularUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check that only Following tab is visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeHidden();
    });

    test("should show both Following and Users tabs for admin users", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check that both tabs are visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
    });

    test("should show Users tab with icon for admin users", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check that Users tab has an icon
      const usersTab = page.getByTestId("tab-users");
      const icon = usersTab.locator("svg");
      await expect(icon).toBeVisible();
    });
  });

  test.describe("Tab Navigation", () => {
    test("should navigate to users page when clicking Users tab", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();

      // Should navigate to users page
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Should see users page content
      await expect(
        page.locator(".border.border-gray-200").first()
      ).toBeVisible();
    });

    test("should show TabLayout on users page", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();

      // Should see TabLayout with users and templates tabs
      await expect(page.getByText("Templates")).toBeVisible();

      // Should be on users page
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });

    test("should handle navigation back to home from users page", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Navigate back to home
      await page.getByRole("link", { name: "OSM for Cities" }).click();
      await expect(page).toHaveURL("http://localhost:3000/en");

      // Should see home dashboard with tabs again
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
    });
  });

  test.describe("Following Tab Content", () => {
    test("should preserve existing dashboard functionality", async ({
      page,
    }) => {
      // Login as regular user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', regularUser.email);
      await page.fill('input[name="password"]', regularUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check welcome message
      await expect(page.getByText(/Welcome back/)).toBeVisible();

      // Check dashboard grid
      const grid = page.getByTestId("followed-datasets-grid");
      const emptyState = page.getByText("No datasets followed yet");

      const hasGrid = await grid.isVisible();
      const isEmpty = await emptyState.isVisible();

      expect(hasGrid || isEmpty).toBe(true);
    });

    test("should show empty state when no datasets are followed", async ({
      page,
    }) => {
      // Login as regular user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', regularUser.email);
      await page.fill('input[name="password"]', regularUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check empty state
      await expect(page.getByText("No datasets followed yet")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Search Cities" })
      ).toBeVisible();
    });

    test("should show followed datasets when user has watched datasets", async ({
      page,
    }) => {
      // Create a test dataset and watch it
      const prisma = new PrismaClient();

      const template = await prisma.template.findFirst();
      if (!template) {
        throw new Error("No template found in database");
      }

      const testArea = await prisma.area.create({
        data: {
          id: Math.floor(Math.random() * 10000) + 1000,
          name: "Test City",
          countryCode: "US",
          bounds: "40.4774,-74.2591,40.9176,-73.7004",
          geojson: {
            type: "FeatureCollection",
            features: [],
          },
        },
      });

      const testDataset = await prisma.dataset.create({
        data: {
          cityName: "Test City",
          isActive: true,
          dataCount: 10,
          templateId: template.id,
          areaId: testArea.id,
          geojson: {
            type: "FeatureCollection",
            features: [],
          },
        },
      });

      await prisma.datasetWatch.create({
        data: {
          datasetId: testDataset.id,
          userId: regularUser.id,
        },
      });

      await prisma.$disconnect();

      // Login as regular user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', regularUser.email);
      await page.fill('input[name="password"]', regularUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check for dataset grid
      const datasetGrid = page.getByTestId("followed-datasets-grid");
      await expect(datasetGrid).toBeVisible();

      // Check for dataset content
      await expect(page.getByText(template.name)).toBeVisible();
      await expect(page.getByText("Test City")).toBeVisible();
      await expect(page.getByText("(US)")).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display tabs correctly on mobile", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check tabs are still visible and functional
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();

      // Test Users tab navigation on mobile
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });

    test("should display tabs correctly on tablet", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check tabs are still visible and functional
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();

      // Test Users tab navigation on tablet
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });
  });

  test.describe("Accessibility", () => {
    test("should support keyboard navigation", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Wait for tabs to be visible
      await expect(page.getByTestId("tab-users")).toBeVisible();

      // Focus directly on the Users tab
      const usersTab = page.getByTestId("tab-users");
      await usersTab.focus();

      // Verify the Users tab is focused
      await expect(usersTab).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press("Enter");

      // Should navigate to users page
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });

    test("should have proper ARIA attributes", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check for proper tablist role
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();

      // Check for proper tab roles
      const followingTab = page.locator('[role="tab"]:has-text("Following")');
      const usersTab = page.locator('[role="tab"]:has-text("Users")');

      await expect(followingTab).toBeVisible();
      await expect(usersTab).toBeVisible();
    });
  });

  test.describe("Cross-browser Compatibility", () => {
    test("should work in different browsers", async ({ page, browserName }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Check tabs are visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();

      // Test navigation
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      console.log(`Tab navigation works correctly in ${browserName}`);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle failed navigation gracefully", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Mock network failure for navigation
      await page.route("**/users", (route) => route.abort());

      // Click Users tab
      await page.getByTestId("tab-users").click();

      // Should show some kind of error indication (not a hanging state)
      // This is a basic test - in reality, we might want to add error boundaries
      await expect(page.getByTestId("tab-following")).toBeVisible();
    });

    test("should handle rapid tab clicks", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en", { timeout: 10000 });

      // Wait for dashboard tabs to be visible
      await expect(page.getByTestId("dashboard-tabs")).toBeVisible();

      // Rapidly click Users tab multiple times
      for (let i = 0; i < 3; i++) {
        // Only click if we're still on the home page and tab is visible
        if (page.url().endsWith("/en")) {
          const usersTab = page.getByTestId("tab-users");
          if (await usersTab.isVisible()) {
            await usersTab.click();
          }
        }
        await page.waitForTimeout(100);
      }

      // Should still navigate correctly
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });
  });
});
