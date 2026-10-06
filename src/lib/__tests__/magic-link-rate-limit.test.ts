import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    verificationToken: {
      count: vi.fn(),
    },
  },
}));

import {
  isMagicLinkRateLimited,
  MAGIC_LINK_TOKEN_TTL_MS,
} from "@/lib/magic-link-rate-limit";
import { prisma } from "@/lib/db";

const mockCount = vi.mocked(prisma.verificationToken.count);

const MINUTE = 60 * 1000;
const now = new Date("2026-10-05T12:00:00Z");

// Token creation time is not stored; it is expires minus the token lifetime.
// "Issued after now - window" therefore means "expires after now - window + TTL".
function issuedAfter(windowMs: number) {
  return new Date(now.getTime() - windowMs + MAGIC_LINK_TOKEN_TTL_MS);
}

// Count tokens issued since the given cutoff, from a list of issue times.
function countFrom(issuedAt: Date[]) {
  mockCount.mockImplementation((async (args: {
    where: { expires: { gt: Date } };
  }) => {
    const cutoff = args.where.expires.gt.getTime() - MAGIC_LINK_TOKEN_TTL_MS;
    return issuedAt.filter((d) => d.getTime() > cutoff).length;
  }) as never);
}

function minutesAgo(n: number) {
  return new Date(now.getTime() - n * MINUTE);
}

describe("isMagicLinkRateLimited", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the first request", async () => {
    countFrom([]);
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(false);
  });

  it("allows a 3rd request within 15 minutes", async () => {
    countFrom([minutesAgo(1), minutesAgo(5)]);
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(false);
  });

  it("blocks a 4th request within 15 minutes", async () => {
    countFrom([minutesAgo(1), minutesAgo(5), minutesAgo(10)]);
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(true);
  });

  it("allows again once older requests leave the 15-minute window", async () => {
    countFrom([minutesAgo(1), minutesAgo(5), minutesAgo(16)]);
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(false);
  });

  it("blocks an 11th request within 24 hours", async () => {
    countFrom(Array.from({ length: 10 }, (_, i) => minutesAgo(60 + i * 60)));
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(true);
  });

  it("allows a 10th request within 24 hours when spread out", async () => {
    countFrom(Array.from({ length: 9 }, (_, i) => minutesAgo(60 + i * 60)));
    expect(await isMagicLinkRateLimited("a@example.com", now)).toBe(false);
  });

  it("queries tokens for the email by derived issue time", async () => {
    countFrom([]);
    await isMagicLinkRateLimited("a@example.com", now);

    expect(mockCount).toHaveBeenCalledWith({
      where: { identifier: "a@example.com", expires: { gt: issuedAfter(15 * MINUTE) } },
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        identifier: "a@example.com",
        expires: { gt: issuedAfter(24 * 60 * MINUTE) },
      },
    });
  });
});
