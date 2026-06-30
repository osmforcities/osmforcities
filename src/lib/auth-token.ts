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
 */
export async function refreshTokenClaims(token: JWT): Promise<JWT> {
  if (!token.id) {
    return token;
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: { isAdmin: true, language: true },
  });
  if (dbUser) {
    token.isAdmin = dbUser.isAdmin;
    token.language = dbUser.language ?? "en";
  }
  return token;
}
