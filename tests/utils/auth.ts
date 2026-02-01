import { Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Authentication utilities for testing
 *
 * This provides utilities for testing authentication-related functionality.
 * Supports both the legacy test-auth approach and the new signup/login workflow.
 */

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  password?: string;
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

  // Hash password for secure storage
  const plainPassword = userData.password || `test-password-${random}`;
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: userData.email || `test-${timestamp}-${random}@example.com`,
      name: userData.name || "Test User",
      password: hashedPassword, // Store hashed password
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
    password: plainPassword, // Return plain password for test login
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
    // Remove all dataset watches for this user
    await prisma.datasetWatch.deleteMany({ where: { userId } });

    // Remove any datasets that have no watchers (test datasets)
    await prisma.dataset.deleteMany({
      where: {
        watchers: {
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

/**
 * Sets up authentication using the new signup/login workflow
 * This creates a real user account and logs them in
 */
export async function setupAuthenticationWithSignup(
  page: Page,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  const user = {
    email: userData.email || `test-${timestamp}-${random}@example.com`,
    name: userData.name || "Test User",
    password: userData.password || `test-password-${random}`,
    language: userData.language,
    isAdmin: userData.isAdmin,
    reportsEnabled: userData.reportsEnabled,
    reportsFrequency: userData.reportsFrequency,
  };

  // First, create the user in the database to get the ID
  const prisma = new PrismaClient();
  const createdUser = await createTestUser(prisma, user);
  await prisma.$disconnect();

  // Now just login with the existing user
  return await setupAuthenticationWithLogin(page, createdUser);
}

/**
 * Sets up authentication using direct login (when user already exists)
 * Uses fast API-based authentication for tests
 */
export async function setupAuthenticationWithLogin(
  page: Page,
  user: TestUser
): Promise<TestUser> {
  // Use fast API-based authentication for tests
  const response = await page.request.post(
    "http://localhost:3000/api/auth/test-signin",
    {
      data: { email: user.email },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Test sign-in failed: ${response.status()} ${response.statusText()}`
    );
  }

  // The API endpoint sets the session cookie automatically
  // Navigate to user's preferred locale to avoid middleware redirect
  const locale = user.language || "en";
  await page.goto(`http://localhost:3000/${locale}`);
  await page.waitForLoadState("domcontentloaded");

  return user;
}
