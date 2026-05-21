import { describe, it, expect } from "vitest";
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from "../../lib/protected-routes";

describe("middleware route detection", () => {
  describe("PROTECTED_ROUTES", () => {
    it("should include dashboard", () => {
      expect(PROTECTED_ROUTES).toContain("/dashboard");
    });

    it("should include preferences", () => {
      expect(PROTECTED_ROUTES).toContain("/preferences");
    });

    it("should include templates", () => {
      expect(PROTECTED_ROUTES).toContain("/templates");
    });

    it("should include users", () => {
      expect(PROTECTED_ROUTES).toContain("/users");
    });
  });

  describe("PUBLIC_ROUTES", () => {
    it("should include root", () => {
      expect(PUBLIC_ROUTES).toContain("/");
    });

    it("should include about", () => {
      expect(PUBLIC_ROUTES).toContain("/about");
    });

    it("should include enter", () => {
      expect(PUBLIC_ROUTES).toContain("/enter");
    });
  });
});
