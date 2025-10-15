import { execSync } from "child_process";

async function globalSetup() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "This setup should only run in test environment. NODE_ENV must be 'test'"
    );
  }

  // Force DATABASE_URL for tests (CI or local)
  const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/osmforcities-test";
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  
  console.log("Setting up test database...");

  try {
    execSync("npx prisma migrate reset --force --skip-seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    execSync("npx prisma db seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });

    console.log("Test database setup complete!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Database setup failed:", errorMessage);
    throw new Error(`Database setup failed: ${errorMessage}`);
  }
}

export default globalSetup;
