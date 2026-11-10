import { Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  language?: string;
  reportsEnabled?: boolean;
  reportsFrequency?: "DAILY" | "WEEKLY";
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  prisma: PrismaClient,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  const user = await prisma.user.create({
    data: {
      email: userData.email || `test-${timestamp}-${random}@example.com`,
      name: userData.name || "Test User",
      isAdmin: userData.isAdmin || false,
      language: userData.language || "en",
      reportsEnabled: userData.reportsEnabled ?? true,
      reportsFrequency:
        (userData.reportsFrequency as "DAILY" | "WEEKLY") || "DAILY",
      emailVerified: new Date(),
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    language: user.language,
    reportsEnabled: user.reportsEnabled,
    reportsFrequency: user.reportsFrequency,
  } as TestUser;
}

/**
 * Creates a test admin user in the database
 */
export async function createAdminTestUser(
  prisma: PrismaClient,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  return await createTestUser(prisma, { ...userData, isAdmin: true });
}

/**
 * Cleans up test user and related data
 */
export async function cleanupTestUser(userId: string) {
  const prisma = new PrismaClient();
  try {
    // Remove all dataset saves for this user
    await prisma.datasetSave.deleteMany({ where: { userId } });

    // Remove any datasets that have no savers (test datasets)
    await prisma.dataset.deleteMany({
      where: {
        savedBy: {
          none: {},
        },
      },
    });

    await prisma.session.deleteMany({ where: { userId } });
    await prisma.verificationToken.deleteMany({
      where: { identifier: { contains: userId } },
    });
    await prisma.user.delete({ where: { id: userId } });
  } finally {
    await prisma.$disconnect();
  }
}

export async function signInAsNewTestUser(
  page: Page,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  const user = {
    email: userData.email || `test-${timestamp}-${random}@example.com`,
    name: userData.name || "Test User",
    language: userData.language,
    isAdmin: userData.isAdmin,
    reportsEnabled: userData.reportsEnabled,
    reportsFrequency: userData.reportsFrequency,
  };

  const prisma = new PrismaClient();
  const createdUser = await createTestUser(prisma, user);
  await prisma.$disconnect();

  return await setupAuthenticationWithLogin(page, createdUser);
}

export async function setupAuthenticationWithLogin(
  page: Page,
  user: TestUser
): Promise<TestUser> {
  const response = await page.request.post("/api/auth/test-signin", {
    data: { email: user.email },
  });

  if (!response.ok()) {
    throw new Error(
      `Test sign-in failed: ${response.status()} ${response.statusText()}`
    );
  }

  // The user's own locale, or the middleware redirects to it
  const locale = user.language || "en";
  await page.goto(`/${locale}`);
  await page.waitForLoadState("domcontentloaded");

  return user;
}
