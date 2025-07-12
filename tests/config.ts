const dbUrl = new URL(process.env.DATABASE_URL!);
if (!dbUrl.pathname.slice(1).includes("-test")) {
  throw new Error(
    `Refusing to run tests on database "${dbUrl.pathname.slice(
      1
    )}". It does not appear to be a test database (name should contain "-test").`
  );
}
