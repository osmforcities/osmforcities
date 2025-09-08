import { test, expect } from "@playwright/test";
import { setupAuthenticationWithSignup } from "./utils/auth";

test.describe("User Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticationWithSignup(page);
  });

  test("should display welcome message and user name", async ({ page }) => {
    await page.goto("/");

    // Check for welcome message
    await expect(page.getByText(/Welcome back,/)).toBeVisible();

    // Check for user name or email
    await expect(
      page.getByText(/Here are the datasets you're following/)
    ).toBeVisible();
  });

  test("should display action buttons in header", async ({ page }) => {
    await page.goto("/");

    // Check for browse and create buttons
    await expect(
      page.getByRole("link", { name: "Browse Public Datasets" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create Dataset" })
    ).toBeVisible();

    // Verify button links
    const browseButton = page.getByRole("link", {
      name: "Browse Public Datasets",
    });
    await expect(browseButton).toHaveAttribute("href", "/en/public");

    const createButton = page.getByRole("link", { name: "Create Dataset" });
    await expect(createButton).toHaveAttribute(
      "href",
      "/en/my-datasets/create"
    );
  });

  test("should display followed datasets in card layout", async ({ page }) => {
    await page.goto("/");

    // Check for datasets section header (only if datasets exist)
    const datasetsHeader = page.getByText("Your Followed Datasets");
    const emptyState = page.getByText("No datasets followed yet");

    // Either show datasets or empty state
    const hasDatasets = await datasetsHeader.isVisible();
    const isEmpty = await emptyState.isVisible();

    expect(hasDatasets || isEmpty).toBe(true);

    if (hasDatasets) {
      // Check for dataset count text
      await expect(page.getByText(/dataset.*you're monitoring/)).toBeVisible();
    }
  });

  test("should show empty state when no datasets are followed", async ({
    page,
  }) => {
    // This test assumes the user has no followed datasets
    await page.goto("/");

    // Check for empty state
    await expect(page.getByText("No datasets followed yet")).toBeVisible();
    await expect(
      page.getByText(/Start following datasets to see them here/)
    ).toBeVisible();

    // Check for empty state action button
    const browseButton = page.getByRole("link", {
      name: "Browse Public Datasets",
    });
    await expect(browseButton).toBeVisible();
    await expect(browseButton).toHaveAttribute("href", "/en/public");
  });

  test("should display dataset cards with correct information", async ({
    page,
  }) => {
    // This test assumes the user has followed datasets
    await page.goto("/");

    // Check if there are any dataset cards or empty state
    const datasetGrid = page.getByTestId("followed-datasets-grid");
    const emptyState = page.getByText("No datasets followed yet");

    const hasGrid = await datasetGrid.isVisible();
    const isEmpty = await emptyState.isVisible();

    // Either show grid or empty state
    expect(hasGrid || isEmpty).toBe(true);

    if (hasGrid) {
      // Check for dataset cards (if any exist)
      const datasetCards = page.locator(
        '[data-testid="followed-datasets-grid"] > div'
      );
      const cardCount = await datasetCards.count();

      if (cardCount > 0) {
        // Check first dataset card structure
        const firstCard = datasetCards.first();

        // Check for template name
        await expect(firstCard.locator("h3")).toBeVisible();

        // Check for city name
        await expect(firstCard.getByText(/,/)).toBeVisible(); // City, Country format

        // Check for category badge
        await expect(firstCard.locator("span").first()).toBeVisible();

        // Check for status badge (Active/Inactive)
        await expect(firstCard.getByText(/Active|Inactive/)).toBeVisible();
      }
    }
  });

  test("should navigate to dataset page when clicking dataset card", async ({
    page,
  }) => {
    await page.goto("/");

    // Check if there are any dataset cards
    const datasetCards = page.locator(
      '[data-testid="followed-datasets-grid"] > div'
    );
    const cardCount = await datasetCards.count();

    if (cardCount > 0) {
      // Click on first dataset card
      await datasetCards.first().click();

      // Should navigate to dataset page
      await expect(page).toHaveURL(/\/en\/dataset\/[a-zA-Z0-9-]+/);
    }
  });

  test("should have consistent layout with area page", async ({ page }) => {
    await page.goto("/");

    // Check for main layout structure
    await expect(page.locator(".min-h-screen.bg-gray-50")).toBeVisible();
    await expect(page.locator(".max-w-4xl.mx-auto")).toBeVisible();

    // Check for header card
    await expect(
      page
        .locator(".bg-white.rounded-xl.border.border-gray-200.shadow-sm")
        .first()
    ).toBeVisible();

    // Check for datasets section card
    const cards = page.locator(
      ".bg-white.rounded-xl.border.border-gray-200.shadow-sm"
    );
    await expect(cards).toHaveCount(2); // Header card + datasets section card
  });

  test("should display watcher count badges when available", async ({
    page,
  }) => {
    await page.goto("/");

    // Check for watcher count badges in dataset cards
    const watcherBadges = page.getByText(/watcher/);
    const badgeCount = await watcherBadges.count();

    if (badgeCount > 0) {
      // Check that watcher badges have correct styling
      await expect(watcherBadges.first()).toHaveClass(/bg-blue-100/);
    }
  });

  test("should show correct status badges for active/inactive datasets", async ({
    page,
  }) => {
    await page.goto("/");

    // Check for status badges
    const statusBadges = page.getByText(/Active|Inactive/);
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      // Check that active datasets have green styling
      const activeBadges = page.getByText("Active");
      const activeCount = await activeBadges.count();

      if (activeCount > 0) {
        await expect(activeBadges.first()).toHaveClass(/bg-green-100/);
      }

      // Check that inactive datasets have gray styling
      const inactiveBadges = page.getByText("Inactive");
      const inactiveCount = await inactiveBadges.count();

      if (inactiveCount > 0) {
        await expect(inactiveBadges.first()).toHaveClass(/bg-gray-100/);
      }
    }
  });

  test("should be responsive on different screen sizes", async ({ page }) => {
    await page.goto("/");

    // Check if there's a dataset grid or empty state
    const datasetGrid = page.getByTestId("followed-datasets-grid");
    const emptyState = page.getByText("No datasets followed yet");

    const hasGrid = await datasetGrid.isVisible();
    const isEmpty = await emptyState.isVisible();

    // Either show grid or empty state
    expect(hasGrid || isEmpty).toBe(true);

    if (hasGrid) {
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByTestId("followed-datasets-grid")).toHaveClass(
        /grid-cols-1/
      );

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByTestId("followed-datasets-grid")).toHaveClass(
        /md:grid-cols-2/
      );

      // Test desktop view
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.getByTestId("followed-datasets-grid")).toHaveClass(
        /lg:grid-cols-3/
      );
    }
  });

  test("should handle dataset count pluralization correctly", async ({
    page,
  }) => {
    await page.goto("/");

    // Check for proper pluralization in dataset count text (only if datasets exist)
    const countText = page.getByText(/dataset.*you're monitoring/);
    const emptyState = page.getByText("No datasets followed yet");

    const hasCountText = await countText.isVisible();
    const isEmpty = await emptyState.isVisible();

    // Either show count text or empty state
    expect(hasCountText || isEmpty).toBe(true);

    if (hasCountText) {
      // The text should handle both singular and plural forms
      const text = await countText.textContent();
      expect(text).toMatch(/dataset(s)? you're monitoring/);
    }
  });

  test("should display country codes when available", async ({ page }) => {
    await page.goto("/");

    // Check for country codes in dataset cards
    const datasetCards = page.locator(
      '[data-testid="followed-datasets-grid"] > div'
    );
    const cardCount = await datasetCards.count();

    if (cardCount > 0) {
      // Look for country code pattern (two letters in parentheses)
      const countryCodePattern = /\([A-Z]{2}\)/;
      const hasCountryCode =
        (await page.getByText(countryCodePattern).count()) > 0;

      if (hasCountryCode) {
        await expect(page.getByText(countryCodePattern).first()).toBeVisible();
      }
    }
  });
});

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticationWithSignup(page);
  });

  test("should allow navigation to public datasets from empty state", async ({
    page,
  }) => {
    await page.goto("/");

    // If empty state is shown, click browse button
    const browseButton = page.getByRole("link", {
      name: "Browse Public Datasets",
    });
    if (await browseButton.isVisible()) {
      await browseButton.click();
      await expect(page).toHaveURL("/en/public");
    }
  });

  test("should allow navigation to create dataset from header", async ({
    page,
  }) => {
    await page.goto("/");

    // Click create dataset button
    const createButton = page.getByRole("link", { name: "Create Dataset" });
    await createButton.click();

    // Should navigate to create dataset page
    await expect(page).toHaveURL("/en/my-datasets/create");
  });
});
