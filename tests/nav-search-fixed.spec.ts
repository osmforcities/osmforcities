import { test, expect } from "@playwright/test";
import { getLocalizedPath } from "./config";

test.describe("NavSearch with Fixed Options", () => {
  test("should show search results for fixed options", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await expect(page.getByRole("option")).toHaveCount(2);
    await expect(page.getByRole("option").first()).toContainText("São Paulo");
    await expect(page.getByRole("option").last()).toContainText(
      "São José dos Campos"
    );
  });

  test("should navigate through results with arrow keys", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").last()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("ArrowUp");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );
  });

  test("should navigate to area page when pressing Enter on selected item", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "data-focused",
      "true"
    );

    await searchInput.press("Enter");

    await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
  });

  test("should navigate to area page when clicking on result", async ({
    page,
  }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.getByRole("option").first().click();

    await expect(page).toHaveURL(getLocalizedPath("/area/54321"));
  });

  test("should close dropdown when pressing Escape", async ({ page }) => {
    await page.goto(getLocalizedPath("/"));

    const searchInput = page.getByPlaceholder("Search cities and areas...");
    await searchInput.fill("são");
    await expect(page.getByRole("listbox")).toBeVisible();

    await searchInput.press("Escape");

    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(searchInput).toHaveValue("");
  });
});
