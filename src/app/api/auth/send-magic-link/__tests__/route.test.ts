import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/email";
import { isMagicLinkRateLimited } from "@/lib/magic-link-rate-limit";
import { LAST_EMAIL_COOKIE } from "@/lib/last-email-cookie";
import { buildMagicLinkEmail } from "@/lib/magic-link-email";

vi.mock("@/auth", () => ({
  findUserByEmail: vi.fn().mockResolvedValue({ id: "user-1", language: "en" }),
  createUser: vi.fn(),
  createVerificationToken: vi.fn().mockResolvedValue({ token: "tok" }),
}));

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

vi.mock("@/lib/magic-link-rate-limit", () => ({
  isMagicLinkRateLimited: vi.fn(),
}));

vi.mock("@/lib/magic-link-email", () => ({
  buildMagicLinkEmail: vi
    .fn()
    .mockResolvedValue({ subject: "s", html: "h", text: "t" }),
}));

import { POST } from "../route";

const call = (email: string, remember?: unknown) =>
  POST(
    new NextRequest("http://localhost:3000/api/auth/send-magic-link", {
      method: "POST",
      body: JSON.stringify({ email, remember }),
    })
  );

describe("POST /api/auth/send-magic-link last-email cookie", () => {
  beforeEach(() => {
    vi.mocked(isMagicLinkRateLimited).mockResolvedValue(false);
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);
  });

  it("sets a 90-day, script-readable cookie on success", async () => {
    const res = await call("User@Example.com", true);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(LAST_EMAIL_COOKIE);
    expect(cookie?.value).toBe("user@example.com");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 90);
    expect(cookie?.httpOnly).toBeFalsy();
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("clears the cookie on success when remember is not opted in", async () => {
    for (const remember of [false, undefined, "true"]) {
      const res = await call("user@example.com", remember);
      expect(res.status).toBe(200);
      const cookie = res.cookies.get(LAST_EMAIL_COOKIE);
      expect(cookie?.value).toBe("");
      expect(new Date(cookie?.expires ?? NaN).getTime()).toBe(0);
    }
  });

  it("does not set the cookie for an invalid email", async () => {
    const res = await call("not-an-email");
    expect(res.status).toBe(400);
    expect(res.cookies.get(LAST_EMAIL_COOKIE)).toBeUndefined();
  });

  it("does not set the cookie when rate limited", async () => {
    vi.mocked(isMagicLinkRateLimited).mockResolvedValueOnce(true);
    const res = await call("user@example.com");
    expect(res.status).toBe(429);
    expect(res.cookies.get(LAST_EMAIL_COOKIE)).toBeUndefined();
  });

  it("does not set the cookie when sending fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));
    const res = await call("user@example.com");
    vi.unstubAllEnvs();
    expect(res.status).toBe(500);
    expect(res.cookies.get(LAST_EMAIL_COOKIE)).toBeUndefined();
  });

  it("returns 400 for a body that is not an object", async () => {
    for (const body of ["null", "42", '"x"']) {
      const res = await POST(
        new NextRequest("http://localhost:3000/api/auth/send-magic-link", {
          method: "POST",
          body,
        })
      );
      expect(res.status).toBe(400);
    }
  });
});

describe("POST /api/auth/send-magic-link return path", () => {
  beforeEach(() => {
    vi.mocked(isMagicLinkRateLimited).mockResolvedValue(false);
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);
    vi.mocked(buildMagicLinkEmail).mockClear();
  });

  const sentLink = async (returnTo: unknown) => {
    await POST(
      new NextRequest("http://localhost:3000/api/auth/send-magic-link", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", returnTo }),
      })
    );
    return new URL(vi.mocked(buildMagicLinkEmail).mock.calls[0][1]);
  };

  it("carries a same-site path in the magic link", async () => {
    const link = await sentLink("/pt-BR/area/1/dataset/bus-stops");
    expect(link.pathname).toBe("/api/auth/verify");
    expect(link.searchParams.get("token")).toBe("tok");
    expect(link.searchParams.get("returnTo")).toBe(
      "/pt-BR/area/1/dataset/bus-stops"
    );
  });

  it.each([undefined, "//evil.com", "https://evil.com"])(
    "leaves the return path out for %j",
    async (returnTo) => {
      const link = await sentLink(returnTo);
      expect(link.searchParams.has("returnTo")).toBe(false);
    }
  );
});
