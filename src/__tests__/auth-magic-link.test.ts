import { describe, it, expect, vi, beforeEach } from "vitest";

type Authorize = (credentials: Record<string, unknown>) => Promise<unknown>;
type CapturedConfig = { providers: Array<{ id: string; authorize: Authorize }> };

const captured = vi.hoisted(() => ({ config: null as CapturedConfig | null }));

vi.mock("next-auth", () => ({
  default: (config: CapturedConfig) => {
    captured.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (options: unknown) => options,
}));

vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    verificationToken: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import "@/auth";
import { prisma } from "@/lib/db";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockTokenFindUnique = vi.mocked(prisma.verificationToken.findUnique);
const mockTokenDelete = vi.mocked(prisma.verificationToken.delete);

const user = {
  id: "user-1",
  email: "maria@example.com",
  name: "Maria",
  isAdmin: false,
  language: "pt-BR",
  emailVerified: null,
};

function authorize(credentials: Record<string, unknown>) {
  const provider = captured.config!.providers.find((p) => p.id === "magic-link");
  return provider!.authorize(credentials);
}

describe("magic-link provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with a valid token and consumes it", async () => {
    mockTokenFindUnique.mockResolvedValue({
      identifier: user.email,
      token: "good",
      expires: new Date(Date.now() + 60_000),
    } as never);
    mockUserFindUnique.mockResolvedValue(user as never);

    const result = await authorize({ token: "good" });

    expect(result).toEqual({
      id: "user-1",
      email: "maria@example.com",
      name: "Maria",
      isAdmin: false,
      language: "pt-BR",
    });
    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { token: "good" } });
  });

  it("rejects an expired token without consuming it", async () => {
    mockTokenFindUnique.mockResolvedValue({
      identifier: user.email,
      token: "old",
      expires: new Date(Date.now() - 60_000),
    } as never);
    mockUserFindUnique.mockResolvedValue(user as never);

    expect(await authorize({ token: "old" })).toBeNull();
    expect(mockTokenDelete).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    mockTokenFindUnique.mockResolvedValue(null as never);

    expect(await authorize({ token: "nope" })).toBeNull();
    expect(mockTokenDelete).not.toHaveBeenCalled();
  });

  it("requires a token credential", async () => {
    mockUserFindUnique.mockResolvedValue(user as never);

    expect(await authorize({ userId: "user-1" })).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
