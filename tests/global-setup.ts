import { execSync } from "child_process";

async function globalSetup() {
  console.log("🚀 Setting up test database...");
  console.log("📊 Environment check:");
  console.log("  - NODE_ENV:", process.env.NODE_ENV);
  console.log("  - CI:", process.env.CI);
  console.log("  - PWD:", process.cwd());
  
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "This setup should only run in test environment. NODE_ENV must be 'test'"
    );
  }

  // Force DATABASE_URL for tests (CI or local)
  const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/osmforcities-test";
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  
  console.log("🔗 Database configuration:");
  console.log("  - DATABASE_URL:", process.env.DATABASE_URL);

  try {
    console.log("🗑️  Resetting test database...");
    execSync("npx prisma migrate reset --force --skip-seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });
    console.log("✅ Database reset complete!");

    console.log("⚡ Running migrations...");
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });
    console.log("✅ Migrations complete!");

    console.log("🌱 Seeding test database...");
    execSync("npx prisma db seed", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });
    console.log("✅ Database seeding complete!");

    console.log("🎉 Test database setup complete!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Database setup failed at step:", errorMessage);
    console.error("Full error details:", error);
    throw new Error(`Database setup failed: ${errorMessage}`);
  }
}

export default globalSetup;
