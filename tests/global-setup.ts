import { execSync } from "child_process";
import { loadEnvConfig } from "@next/env";

async function globalSetup() {
  console.log("Setting up test database...");
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "This setup should only run in test environment. NODE_ENV must be 'test'"
    );
  }

  // Load environment variables from .env.test
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  try {
    console.log("Resetting test database...");
    execSync("npx prisma migrate reset --force --skip-seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    console.log("Running migrations...");
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    console.log("Seeding test database...");
    execSync("npx prisma db seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    console.log("Test database setup complete!");
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
}

export default globalSetup;
