import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/email";
import { isMagicLinkRateLimited } from "@/lib/magic-link-rate-limit";

vi.mock("@/auth", () => ({
  findUserByEmail: vi.fn().mockResolvedValue({ id: "user-1", language: "en" }),
  createUser: vi.fn(),
  createVerificationToken: vi.fn().mockResolvedValue({ token: "tok" }),
}));

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

vi.mock("@/lib/magic-link-rate-limit", () => ({
  isMagicLinkRateLimited: vi.fn(),
}));

vi.mock("@/lib/email-i18n", () => ({
  formatEmail: vi.fn().mockResolvedValue("body"),
  createEmailLink: vi.fn().mockReturnValue("link"),
}));

import { POST } from "../route";

const call = (email: string) =>
  POST(
    new NextRequest("http://localhost:3000/api/auth/send-magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  );

describe("POST /api/auth/send-magic-link last-email cookie", () => {
  beforeEach(() => {
    vi.mocked(isMagicLinkRateLimited).mockResolvedValue(false);
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);
  });

  it("sets a 90-day, script-readable cookie on success", async () => {
    const res = await call("User@Example.com");
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("last-email");
    expect(cookie?.value).toBe("user@example.com");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 90);
    expect(cookie?.httpOnly).toBeFalsy();
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("does not set the cookie for an invalid email", async () => {
    const res = await call("not-an-email");
    expect(res.status).toBe(400);
    expect(res.cookies.get("last-email")).toBeUndefined();
  });

  it("does not set the cookie when rate limited", async () => {
    vi.mocked(isMagicLinkRateLimited).mockResolvedValueOnce(true);
    const res = await call("user@example.com");
    expect(res.status).toBe(429);
    expect(res.cookies.get("last-email")).toBeUndefined();
  });

  it("does not set the cookie when sending fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));
    const res = await call("user@example.com");
    vi.unstubAllEnvs();
    expect(res.status).toBe(500);
    expect(res.cookies.get("last-email")).toBeUndefined();
  });
});
