import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn() } },
}));

import { POST } from "../route";

type Session = Awaited<ReturnType<typeof auth>>;

const session = (isAdmin: boolean | null): Session =>
  isAdmin === null
    ? null
    : ({
        user: { id: "user-1", email: "user@test.com", isAdmin },
      } as unknown as Session);

const call = () =>
  POST(
    new NextRequest("http://localhost:3000/api/datasets/does-not-exist/refresh", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "does-not-exist" }) }
  );

describe("POST /api/datasets/[id]/refresh", () => {
  beforeEach(() => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(null));
    const res = await call();
    expect(res.status).toBe(401);
    expect(prisma.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users (no dataset lookup)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(false));
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden");
    expect(prisma.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("lets admins past the gate to the dataset lookup (404 for a missing dataset)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(session(true));
    const res = await call();
    expect(res.status).toBe(404);
    expect(prisma.dataset.findUnique).toHaveBeenCalledOnce();
    expect(prisma.dataset.findUnique).toHaveBeenCalledWith({
      where: { id: "does-not-exist" },
      include: expect.any(Object),
    });
  });
});
