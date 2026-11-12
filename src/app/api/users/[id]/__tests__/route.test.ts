import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PATCH } from "../route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { user: { updateMany: vi.fn() } },
}));

const patch = (body: unknown, id = "u2") =>
  PATCH(
    new NextRequest(`http://localhost/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

const signedInAs = (isAdmin: boolean) =>
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1", isAdmin } } as never);

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs(true);
  vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
});

describe("PATCH /api/users/[id]", () => {
  it("sets a user's save limit", async () => {
    const res = await patch({ saveLimit: 30 });

    expect(res.status).toBe(200);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { saveLimit: 30 },
    });
  });

  it("null clears the save limit back to the default", async () => {
    await patch({ saveLimit: null });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { saveLimit: null },
    });
  });

  it("promotes and demotes other users", async () => {
    await patch({ isAdmin: true, saveLimit: 30 });
    await patch({ isAdmin: false });

    expect(prisma.user.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "u2" },
      data: { isAdmin: true, saveLimit: 30 },
    });
    expect(prisma.user.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "u2" },
      data: { isAdmin: false },
    });
  });

  it("an admin cannot remove their own admin flag", async () => {
    const res = await patch({ isAdmin: false }, "u1");

    expect(res.status).toBe(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("an admin can still change their own save limit", async () => {
    const res = await patch({ isAdmin: true, saveLimit: 50 }, "u1");

    expect(res.status).toBe(200);
  });

  it("rejects non-admins", async () => {
    signedInAs(false);

    const res = await patch({ saveLimit: 30 });

    expect(res.status).toBe(403);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects signed-out requests", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await patch({ saveLimit: 30 });

    expect(res.status).toBe(403);
  });

  it.each([
    { saveLimit: 0 },
    { saveLimit: -1 },
    { saveLimit: 2.5 },
    { saveLimit: "30" },
    { isAdmin: "yes" },
    { email: "x@example.com" },
  ])("rejects %j", async (body) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("404s an unknown user", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

    const res = await patch({ saveLimit: 30 });

    expect(res.status).toBe(404);
  });
});
