import { execSync } from "child_process";
import { TEST_DATABASE_URL } from "./config";

async function globalSetup() {
  console.log("Setting up test database...");
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "This setup should only run in test environment. NODE_ENV must be 'test'"
    );
  }

  process.env.DATABASE_URL = TEST_DATABASE_URL;

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

    console.log("Test database setup complete!");
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
}

export default globalSetup;
