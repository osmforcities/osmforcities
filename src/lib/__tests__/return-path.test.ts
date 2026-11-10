import { describe, it, expect } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("safeReturnPath", () => {
  it.each([
    "/en/area/271110/dataset/drinking-water",
    "/pt-BR/area/1/dataset/bus-stops?view=map#top",
    "/",
  ])("keeps the same-site path %s", (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    "//evil.com",
    "//evil.com/en",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    " /en",
    "https://evil.com",
    "http:/evil.com",
    "javascript:alert(1)",
    "en/area/1",
    "",
  ])("falls back to / for %j", (value) => {
    expect(safeReturnPath(value)).toBe("/");
  });

  it.each([undefined, null, 42, ["/en"], { path: "/en" }])(
    "falls back to / for non-string %j",
    (value) => {
      expect(safeReturnPath(value)).toBe("/");
    }
  );
});
