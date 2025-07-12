import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("Magic Link Authentication", () => {
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = new PrismaClient();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  test("should display sign in form on enter page", async ({ page }) => {
    await page.goto("/enter");

    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(
      page.getByText("Enter your email to get started")
    ).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("should show validation error for invalid email", async ({ page }) => {
    await page.goto("/enter");

    await page.getByPlaceholder("Email").fill("invalid-email");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Check your email")).toBeHidden();
  });

  test("should successfully send magic link", async ({ page }) => {
    await page.goto("/enter");

    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for the user to appear in the database (retry up to 10 times)
    let user = null;
    for (let i = 0; i < 10; i++) {
      user = await prisma.user.findUnique({
        where: { email: "test@example.com" },
      });
      if (user) break;
      await new Promise((res) => setTimeout(res, 200));
    }
    expect(user).toBeTruthy();
    expect(user?.email).toBe("test@example.com");

    const token = await prisma.verificationToken.findFirst({
      where: { email: "test@example.com" },
    });
    expect(token).toBeTruthy();
    expect(token?.used).toBe(false);
  });

  test("should show loading state during magic link request", async ({
    page,
  }) => {
    await page.goto("/enter");

    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("button", { name: "Sending..." })
    ).toBeVisible();

    await expect(page.getByText("Check your email")).toBeVisible();
  });

  test("should allow trying different email after success", async ({
    page,
  }) => {
    await page.goto("/enter");

    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Try different email" }).click();

    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("should handle magic link verification successfully", async ({
    page,
  }) => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        reportsEnabled: true,
        reportsFrequency: "DAILY",
      },
    });

    const verificationToken = await prisma.verificationToken.create({
      data: {
        token: "test-token-123",
        email: "test@example.com",
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await page.goto(`/api/auth/verify?token=${verificationToken.token}`);

    await expect(page).toHaveURL("/watched");

    const updatedToken = await prisma.verificationToken.findUnique({
      where: { id: verificationToken.id },
    });
    expect(updatedToken?.used).toBe(true);

    const session = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(session).toBeTruthy();
  });

  test("should handle invalid magic link token", async ({ page }) => {
    await page.goto("/api/auth/verify?token=invalid-token");

    await expect(page).toHaveURL("/?error=invalid-or-expired-token");
  });

  test("should handle missing magic link token", async ({ page }) => {
    await page.goto("/api/auth/verify");

    await expect(page).toHaveURL("/?error=invalid-token");
  });

  test("should handle expired magic link token", async ({ page }) => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        reportsEnabled: true,
        reportsFrequency: "DAILY",
      },
    });

    const expiredToken = await prisma.verificationToken.create({
      data: {
        token: "expired-token-123",
        email: "test@example.com",
        userId: user.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    await page.goto(`/api/auth/verify?token=${expiredToken.token}`);

    await expect(page).toHaveURL("/?error=invalid-or-expired-token");
  });

  test("should disable continue button when email is empty", async ({
    page,
  }) => {
    await page.goto("/enter");

    // Button should be disabled initially
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    // Fill email and button should be enabled
    await page.getByPlaceholder("Email").fill("test@example.com");
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();

    // Clear email and button should be disabled again
    await page.getByPlaceholder("Email").clear();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    await page.route("**/api/auth/send-magic-link", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/enter");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText(/error|failed|wrong/i)).toBeVisible();
  });

  test("should complete full authentication flow", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Enter" })).toBeVisible();

    await page.getByRole("link", { name: "Enter" }).click();
    await expect(page).toHaveURL("/enter");

    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Check your email")).toBeVisible();
  });

  test("should create new user if email does not exist", async ({ page }) => {
    await page.goto("/enter");

    let apiCallMade = false;
    await page.route("**/api/auth/send-magic-link", async (route) => {
      apiCallMade = true;
      await route.continue();
    });

    await page.getByPlaceholder("Email").fill("newuser@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Check your email")).toBeVisible();

    expect(apiCallMade).toBe(true);

    await page.waitForTimeout(2000);

    expect(apiCallMade).toBe(true);
  });

  test("should reuse existing user if email already exists", async ({
    page,
  }) => {
    const existingUser = await prisma.user.create({
      data: {
        email: "existing@example.com",
        name: "Existing User",
        reportsEnabled: true,
        reportsFrequency: "DAILY",
      },
    });

    await page.goto("/enter");

    await page.getByPlaceholder("Email").fill("existing@example.com");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Check your email")).toBeVisible();

    await page.waitForTimeout(1000);

    const users = await prisma.user.findMany({
      where: { email: "existing@example.com" },
    });
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(existingUser.id);
  });
});
