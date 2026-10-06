import { describe, it, expect, afterEach, vi } from "vitest";
import { isTestAuthEnabled } from "@/lib/test-auth";

describe("isTestAuthEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is on when the flag is set outside production", () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    vi.stubEnv("NODE_ENV", "test");
    expect(isTestAuthEnabled()).toBe(true);
  });

  it("is off in production even when the flag is set", () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(isTestAuthEnabled()).toBe(false);
  });

  it("is off when the flag is unset", () => {
    vi.stubEnv("ENABLE_TEST_AUTH", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isTestAuthEnabled()).toBe(false);
  });
});
