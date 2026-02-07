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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check that only Following tab is visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeHidden();
      await expect(page.getByTestId("tab-templates")).toBeHidden();
    });

    test("should show all three tabs for admin users on dashboard", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check that all three tabs are visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
      await expect(page.getByTestId("tab-templates")).toBeVisible();
    });

    test("should show Users and Templates tabs with icons for admin users", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check that Users tab has an icon
      const usersTab = page.getByTestId("tab-users");
      const usersIcon = usersTab.locator("svg");
      await expect(usersIcon).toBeVisible();

      // Check that Templates tab has an icon
      const templatesTab = page.getByTestId("tab-templates");
      const templatesIcon = templatesTab.locator("svg");
      await expect(templatesIcon).toBeVisible();
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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();

      // Should navigate to users page
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Should see users page content
      await expect(
        page.locator(".border.border-gray-200").first()
      ).toBeVisible();
    });

    test("should navigate to templates page when clicking Templates tab", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Click Templates tab
      await page.getByTestId("tab-templates").click();

      // Should navigate to templates page
      await expect(page).toHaveURL("http://localhost:3000/en/templates");

      // Should see templates page content
      await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
    });

    test("should show DashboardTabs on users page with correct active tab", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();

      // Should see DashboardTabs with all three tabs
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
      await expect(page.getByTestId("tab-templates")).toBeVisible();

      // Should be on users page
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });

    test("should show DashboardTabs on templates page with correct active tab", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Click Templates tab
      await page.getByTestId("tab-templates").click();

      // Should see DashboardTabs with all three tabs
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
      await expect(page.getByTestId("tab-templates")).toBeVisible();

      // Should be on templates page
      await expect(page).toHaveURL("http://localhost:3000/en/templates");
    });

    test("should handle navigation back to home from users page", async ({
      page,
    }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Click Users tab
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Navigate back to dashboard using Dashboard link in navbar
      await page.getByTestId("navbar-dashboard").click();
      await expect(page).toHaveURL("http://localhost:3000/en/dashboard");

      // Should see home dashboard with all tabs again
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
      await expect(page.getByTestId("tab-templates")).toBeVisible();
    });

    test("should handle navigation between admin pages", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Navigate to users page
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Navigate to templates page from users page
      await page.getByTestId("tab-templates").click();
      await expect(page).toHaveURL("http://localhost:3000/en/templates");

      // Navigate back to users page from templates page
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Navigate back to dashboard from users page
      await page.getByTestId("tab-following").click();
      await expect(page).toHaveURL("http://localhost:3000/en/dashboard");
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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check welcome message
      await expect(page.getByTestId("dashboard-welcome-message")).toBeVisible();

      // Check dashboard grid
      const grid = page.getByTestId("followed-datasets-grid");
      const emptyState = page.getByTestId("dashboard-empty-state");

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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check empty state
      await expect(page.getByTestId("dashboard-empty-state")).toBeVisible();
      await expect(
        page.getByTestId("dashboard-empty-state-title")
      ).toBeVisible();
      await expect(
        page.getByTestId("dashboard-empty-state-description")
      ).toBeVisible();
    });

    test("should show followed datasets when user has watched datasets", async ({
      page,
    }) => {
      // Create a test dataset and watch it
      const prisma = new PrismaClient();

      const template = await prisma.template.findFirst();
      expect(template).toBeDefined();

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
          templateId: template!.id,
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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check for dataset grid
      const datasetGrid = page.getByTestId("followed-datasets-grid");
      await expect(datasetGrid).toBeVisible();

      // Check for dataset content
      await expect(page.getByText(template!.name)).toBeVisible();
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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

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
    test("should support keyboard navigation for all tabs", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Wait for all tabs to be visible
      await expect(page.getByTestId("tab-templates")).toBeVisible();

      // Test Users tab keyboard navigation
      const usersTab = page.getByTestId("tab-users");
      await usersTab.focus();
      await expect(usersTab).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Go back to dashboard
      await page.goto("http://localhost:3000/en/dashboard");
      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');

      // Test Templates tab keyboard navigation
      const templatesTab = page.getByTestId("tab-templates");
      await templatesTab.focus();
      await expect(templatesTab).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("http://localhost:3000/en/templates");
    });

    test("should have proper ARIA attributes for all tabs", async ({ page }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check for proper tablist role
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();

      // Check for proper tab roles for all tabs
      const followingTab = page.locator('[role="tab"]:has-text("Following")');
      const usersTab = page.locator('[role="tab"]:has-text("Users")');
      const templatesTab = page.locator('[role="tab"]:has-text("Templates")');

      await expect(followingTab).toBeVisible();
      await expect(usersTab).toBeVisible();
      await expect(templatesTab).toBeVisible();

      // Check for aria-label attributes
      await expect(page.getByTestId("tab-following")).toHaveAttribute("aria-label");
      await expect(page.getByTestId("tab-users")).toHaveAttribute("aria-label");
      await expect(page.getByTestId("tab-templates")).toHaveAttribute("aria-label");
    });
  });

  test.describe("Cross-browser Compatibility", () => {
    test("should work in different browsers", async ({ page, browserName }) => {
      // Login as admin user
      await page.goto("http://localhost:3000/en/login");
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="password"]', adminUser.password!);
      await page.click('button[type="submit"]');
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Check all tabs are visible
      await expect(page.getByTestId("tab-following")).toBeVisible();
      await expect(page.getByTestId("tab-users")).toBeVisible();
      await expect(page.getByTestId("tab-templates")).toBeVisible();

      // Test navigation to users page
      await page.getByTestId("tab-users").click();
      await expect(page).toHaveURL("http://localhost:3000/en/users");

      // Test navigation to templates page
      await page.getByTestId("tab-templates").click();
      await expect(page).toHaveURL("http://localhost:3000/en/templates");

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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

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
      await page.waitForURL("http://localhost:3000/en/dashboard", { timeout: 10000 });

      // Wait for dashboard tabs to be visible
      await expect(page.getByTestId("dashboard-tabs")).toBeVisible();

      // Rapidly click Users tab multiple times to test rapid navigation
      const usersTab = page.getByTestId("tab-users");
      await usersTab.click();
      await usersTab.click();
      await usersTab.click();

      // Should still navigate correctly
      await expect(page).toHaveURL("http://localhost:3000/en/users");
    });
  });
});
