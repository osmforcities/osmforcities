import { prisma } from "@/lib/db";

const MINUTE = 60 * 1000;

export const MAGIC_LINK_TOKEN_TTL_MS = 24 * 60 * MINUTE;

const LIMITS = [
  { windowMs: 15 * MINUTE, max: 3 },
  { windowMs: 24 * 60 * MINUTE, max: 10 },
];

/**
 * Per-email limit on sign-in emails, counted from existing verification
 * tokens. Tokens store no creation time, so it is derived as expires - TTL.
 * Tokens consumed by a sign-in are deleted and stop counting, which is fine:
 * the limit targets addresses that never click.
 */
export async function isMagicLinkRateLimited(
  email: string,
  now: Date = new Date()
): Promise<boolean> {
  for (const { windowMs, max } of LIMITS) {
    const count = await prisma.verificationToken.count({
      where: {
        identifier: email,
        expires: {
          gt: new Date(now.getTime() - windowMs + MAGIC_LINK_TOKEN_TTL_MS),
        },
      },
    });
    if (count >= max) return true;
  }
  return false;
}
