import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { PUT } from "../route";

type Session = Awaited<ReturnType<typeof auth>>;

const current = {
  reportsEnabled: true,
  reportsFrequency: "DAILY" as const,
  language: "en",
};

const put = (body: object) =>
  PUT(
    new NextRequest("http://localhost:3000/api/preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  );

const updateData = () => vi.mocked(prisma.user.update).mock.calls[0][0].data;

describe("PUT /api/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as unknown as Session);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      current as Awaited<ReturnType<typeof prisma.user.findUnique>>
    );
    vi.mocked(prisma.user.update).mockImplementation(
      (async ({ data }: { data: object }) => ({
        ...current,
        ...data,
      })) as unknown as typeof prisma.user.update
    );
  });

  it("updates only the language when only language is sent", async () => {
    const res = await put({ language: "es" });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({ language: "es" });
    expect(res.cookies.get("language-preference")?.value).toBe("es");
  });

  it("updates only report fields when language is not sent", async () => {
    const res = await put({ reportsEnabled: true, reportsFrequency: "WEEKLY" });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({
      reportsEnabled: true,
      reportsFrequency: "WEEKLY",
      lastReportSent: expect.any(Date),
    });
    expect(res.cookies.get("language-preference")).toBeUndefined();
  });
});
