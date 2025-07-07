export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres@localhost:5433/osmforcities-test";

const dbUrl = new URL(TEST_DATABASE_URL);
if (!dbUrl.pathname.slice(1).includes("-test")) {
  throw new Error(
    `Refusing to run tests on database "${dbUrl.pathname.slice(
      1
    )}". It does not appear to be a test database (name should contain "-test").`
  );
}
