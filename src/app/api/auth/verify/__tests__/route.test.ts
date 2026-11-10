import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { findTokenUser, signIn } from "@/auth";

vi.mock("@/auth", () => ({
  findTokenUser: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { update: vi.fn() } },
}));

vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn(),
  getClientInfo: vi.fn(),
}));

import { GET } from "../route";

const verify = async (query: string) => {
  const res = await GET(
    new NextRequest(`http://localhost:3000/api/auth/verify?${query}`)
  );
  const location = new URL(res.headers.get("location")!);
  return `${location.origin}${location.pathname}${location.search}`;
};

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findTokenUser).mockResolvedValue({
      user: { id: "user-1", emailVerified: new Date() },
    } as never);
    vi.mocked(signIn).mockResolvedValue(undefined as never);
  });

  it("redirects home without a return path", async () => {
    expect(await verify("token=tok")).toBe("http://localhost:3000/");
  });

  it("redirects to the return path after sign-in", async () => {
    const returnTo = encodeURIComponent("/pt-BR/area/1/dataset/bus-stops");
    expect(await verify(`token=tok&returnTo=${returnTo}`)).toBe(
      "http://localhost:3000/pt-BR/area/1/dataset/bus-stops"
    );
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/\t/evil.com"])(
    "redirects home for the off-site return path %j",
    async (returnTo) => {
      expect(
        await verify(`token=tok&returnTo=${encodeURIComponent(returnTo)}`)
      ).toBe("http://localhost:3000/");
    }
  );

  it("keeps the expired-link error and ignores the return path", async () => {
    vi.mocked(findTokenUser).mockResolvedValue(null as never);
    expect(await verify("token=old&returnTo=%2Fen%2Fdashboard")).toBe(
      "http://localhost:3000/?error=invalid-or-expired-token"
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("keeps the missing-token error", async () => {
    expect(await verify("returnTo=%2Fen%2Fdashboard")).toBe(
      "http://localhost:3000/?error=invalid-token"
    );
  });
});
