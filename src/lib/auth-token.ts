import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const logger = createLogger("auth-token");

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
 * - If the lookup throws (transient DB issue), the existing claims are
 *   preserved so a DB blip doesn't take down auth/session resolution.
 * - If the user row no longer exists (deleted account), privileged claims are
 *   cleared so a stale admin token can't retain admin access until expiry.
 */
export async function refreshTokenClaims(token: JWT): Promise<JWT> {
  if (!token.id) {
    return token;
  }
  let dbUser: { isAdmin: boolean; language: string | null } | null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { isAdmin: true, language: true },
    });
  } catch (error) {
    logger.error("Failed to refresh token claims; keeping existing claims", {
      userId: token.id,
      error,
    });
    return token;
  }
  if (dbUser) {
    token.isAdmin = dbUser.isAdmin;
    token.language = dbUser.language ?? "en";
  } else {
    // User no longer exists — fail closed.
    token.isAdmin = false;
  }
  return token;
}
