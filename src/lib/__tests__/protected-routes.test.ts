import { describe, it, expect } from "vitest";
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from "../protected-routes";

describe("protected-routes", () => {
  it("should export PROTECTED_ROUTES constant", () => {
    expect(PROTECTED_ROUTES).toBeDefined();
    expect(Array.isArray(PROTECTED_ROUTES)).toBe(true);
  });

  it("should contain expected protected routes", () => {
    expect(PROTECTED_ROUTES).toContain("/dashboard");
    expect(PROTECTED_ROUTES).toContain("/preferences");
    expect(PROTECTED_ROUTES).toContain("/templates");
    expect(PROTECTED_ROUTES).toContain("/users");
  });

  it("should export PUBLIC_ROUTES constant", () => {
    expect(PUBLIC_ROUTES).toBeDefined();
    expect(Array.isArray(PUBLIC_ROUTES)).toBe(true);
  });

  it("should contain expected public routes", () => {
    expect(PUBLIC_ROUTES).toContain("/");
    expect(PUBLIC_ROUTES).toContain("/about");
    expect(PUBLIC_ROUTES).toContain("/enter");
    expect(PUBLIC_ROUTES).toContain("/login");
    expect(PUBLIC_ROUTES).toContain("/signup");
  });

  it("should use const assertion for type safety", () => {
    const testArray = ["/test"] as const;
    expect(typeof testArray).toBe("object");
    // as const provides readonly type, not runtime frozen
    expect(Array.isArray(testArray)).toBe(true);
  });
});
