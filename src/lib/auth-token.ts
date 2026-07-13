import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";

/**
 * Refreshes admin status and language on the JWT from the database so that
 * role changes take effect without requiring re-login. Mutates and returns the
 * token.
 *
 * The previous auth callback only wrote these claims on sign-in, so a user
 * promoted to admin after their session was created — or whose token claims
 * were reset by a next-auth upgrade — kept a stale `isAdmin: false` token,
 * hiding the featured toggle and other admin UI until they signed out and in.
 *
 * Failure modes:
 * - If the lookup throws (transient DB issue) or exceeds CLAIM_REFRESH_TIMEOUT_MS,
 *   the existing claims are preserved so a DB blip or slowness doesn't stall
 *   middleware/page loads site-wide.
 * - If the user row no longer exists (deleted account), privileged claims are
 *   cleared so a stale admin token can't retain admin access until expiry.
 */

// Bound the DB lookup so a slow/hung database degrades to stale claims instead
// of stalling every request that runs through middleware (which resolves the
// JWT, and therefore this function, on the Node runtime).
const CLAIM_REFRESH_TIMEOUT_MS = 2000;

export async function refreshTokenClaims(token: JWT): Promise<JWT> {
  if (!token.id) {
    return token;
  }

  // Sentinel distinguishing a timed-out lookup (preserve existing claims) from
  // a real `findUnique` that returned null (user deleted — fail closed).
  const TIMED_OUT = Symbol("timed-out");
  type LookupResult = { isAdmin: boolean; language: string | null } | null | typeof TIMED_OUT;

  let result: LookupResult;
  try {
    const lookup = prisma.user
      .findUnique({
        where: { id: token.id as string },
        select: { isAdmin: true, language: true },
      })
      .then((u) => u as LookupResult);

    result = await Promise.race<LookupResult>([
      lookup,
      new Promise<LookupResult>((resolve) =>
        setTimeout(() => resolve(TIMED_OUT), CLAIM_REFRESH_TIMEOUT_MS)
      ),
    ]);
  } catch (error) {
    // console.error (not the winston logger) — this module is imported by the
    // middleware bundle via auth.ts; keep this path dependency-light.
    console.error("Failed to refresh token claims; keeping existing claims", {
      userId: token.id,
      error,
    });
    return token;
  }

  if (result === TIMED_OUT) {
    // Slow DB — preserve existing claims rather than stalling the request.
    console.warn("refreshTokenClaims timed out; keeping existing claims", {
      userId: token.id,
    });
    return token;
  }

  if (result) {
    token.isAdmin = result.isAdmin;
    token.language = result.language ?? "en";
  } else {
    // User no longer exists — fail closed.
    token.isAdmin = false;
  }
  return token;
}
