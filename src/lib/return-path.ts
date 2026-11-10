// Browsers read "//host" and "/\host" as another site, and drop tabs and
// newlines before parsing, so "/\t/host" turns into "//host".
const SAME_SITE_PATH = /^\/(?![/\\])[^\\\s\x00-\x1f\x7f]*$/;

export function safeReturnPath(value: unknown): string {
  return typeof value === "string" && SAME_SITE_PATH.test(value) ? value : "/";
}
