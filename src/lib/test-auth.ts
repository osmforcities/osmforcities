/**
 * Test auth signs users in with an unsigned cookie, so it must never run in
 * production. The NODE_ENV check is a second lock in case ENABLE_TEST_AUTH
 * leaks into a production env file. Playwright runs `next dev` with
 * NODE_ENV=test, so it is unaffected.
 */
export function isTestAuthEnabled(): boolean {
  return (
    process.env.ENABLE_TEST_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
