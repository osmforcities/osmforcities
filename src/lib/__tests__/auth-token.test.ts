import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { refreshTokenClaims } from "@/lib/auth-token";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.user.findUnique);

describe("refreshTokenClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes isAdmin from the DB even when the token claim is stale", async () => {
    // Token was minted before the user was promoted to admin: isAdmin is false.
    mockFindUnique.mockResolvedValue({
      isAdmin: true,
      language: "en",
    } as never);

    const token = { id: "user-1", isAdmin: false, language: "en" };
    const result = await refreshTokenClaims(token as never);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { isAdmin: true, language: true },
    });
    expect(result.isAdmin).toBe(true);
  });

  it("clears isAdmin when the user is no longer an admin in the DB", async () => {
    mockFindUnique.mockResolvedValue({
      isAdmin: false,
      language: "pt-BR",
    } as never);

    const token = { id: "user-1", isAdmin: true, language: "en" };
    const result = await refreshTokenClaims(token as never);

    expect(result.isAdmin).toBe(false);
    expect(result.language).toBe("pt-BR");
  });

  it("leaves the token untouched when it has no id", async () => {
    const token = { isAdmin: true };
    const result = await refreshTokenClaims(token as never);

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(result.isAdmin).toBe(true);
  });

  it("fails closed (clears isAdmin) when the user is missing from the DB", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const token = { id: "ghost", isAdmin: true, language: "en" };
    const result = await refreshTokenClaims(token as never);

    expect(result.isAdmin).toBe(false);
  });

  it("preserves existing claims when the DB lookup throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("connection refused"));

    const token = { id: "user-1", isAdmin: true, language: "en" };
    const result = await refreshTokenClaims(token as never);

    expect(result.isAdmin).toBe(true);
  });
});
