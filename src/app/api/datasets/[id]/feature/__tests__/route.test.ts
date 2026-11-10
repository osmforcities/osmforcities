import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/umami", () => ({
  trackEvent: vi.fn(),
  getClientInfo: vi.fn(),
}));

import { PUT } from "../route";

let isFeatured: boolean;

function toggleIsFeatured(_sql: TemplateStringsArray, id: string) {
  if (id !== "ds-1") return Promise.resolve([]);
  isFeatured = !isFeatured;
  return Promise.resolve([{ id, isFeatured }]);
}

const signInAs = (isAdmin: boolean) =>
  vi.mocked(auth).mockResolvedValue({
    user: { id: "user-1", email: "user@test.com", isAdmin },
  } as never);

const call = (id: string) =>
  PUT(
    new NextRequest(`http://localhost:3000/api/datasets/${id}/feature`, {
      method: "PUT",
    }),
    { params: Promise.resolve({ id }) }
  );

describe("PUT /api/datasets/[id]/feature", () => {
  beforeEach(() => {
    isFeatured = false;
    vi.mocked(prisma.$queryRaw).mockImplementation(toggleIsFeatured as never);
  });

  it("returns 403 for a non-admin and leaves the flag unchanged", async () => {
    signInAs(false);

    const res = await call("ds-1");

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden");
    expect(isFeatured).toBe(false);
  });

  it("returns 403 when signed out", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await call("ds-1");

    expect(res.status).toBe(403);
  });

  it("returns 404 for a missing dataset", async () => {
    signInAs(true);

    const res = await call("missing");

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Dataset not found");
  });

  it("flips the flag for an admin, both ways", async () => {
    signInAs(true);

    const featured = await call("ds-1");
    expect(featured.status).toBe(200);
    expect(await featured.json()).toEqual({ id: "ds-1", isFeatured: true });
    expect(vi.mocked(trackEvent).mock.lastCall?.[0]).toBe(
      ANALYTICS_EVENTS.DATASET_FEATURED
    );

    const unfeatured = await call("ds-1");
    expect(await unfeatured.json()).toEqual({ id: "ds-1", isFeatured: false });
    expect(vi.mocked(trackEvent).mock.lastCall?.[0]).toBe(
      ANALYTICS_EVENTS.DATASET_UNFEATURED
    );
  });
});
