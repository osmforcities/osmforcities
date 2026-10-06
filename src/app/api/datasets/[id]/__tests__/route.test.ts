import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { dataset: { findUnique: vi.fn() } },
}));

import { GET } from "../route";

const call = (id: string) =>
  GET(new NextRequest(`http://localhost:3000/api/datasets/${id}`), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/datasets/[id]", () => {
  it("never selects the owner record: the route is public", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValueOnce({
      id: "ds-1",
      template: { category: { id: "c", name: "n", slug: "s" } },
      area: { id: 1 },
    } as never);

    const res = await call("ds-1");

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.dataset.findUnique).mock.calls[0][0];
    expect(args.include).not.toHaveProperty("user");
    expect(args.omit).toEqual({ userId: true });
    expect(await res.json()).not.toHaveProperty("user");
  });

  it("returns 404 for a missing dataset", async () => {
    vi.mocked(prisma.dataset.findUnique).mockResolvedValueOnce(null);
    expect((await call("missing")).status).toBe(404);
  });
});
