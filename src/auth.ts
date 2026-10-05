/**
 * NextAuth configuration
 *
 * IMPORTANT: Post-login redirects are handled client-side in src/hooks/use-auth.ts
 * The login flow uses `signIn()` with `redirect: false`, then does `window.location.href`.
 * Do NOT add a `redirect` callback here - it won't be used by our current login flow.
 *
 * Test auth: uses test-auth-session cookie (see test utils)
 * Production auth: uses magic links (email) or password
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { refreshTokenClaims } from "@/lib/auth-token";
import { MAGIC_LINK_TOKEN_TTL_MS } from "@/lib/magic-link-rate-limit";

type DatabaseUser = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  language: string | null;
};

function generateSecureToken(length = 32) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/** Creates a user object for NextAuth session from database user */
function createUserObject(user: DatabaseUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    language: user.language || "en",
  };
}

/** Creates a test user object for test authentication */
function createTestUserObject(
  id: string,
  email: string,
  name: string,
  isAdmin = false,
  language = "en"
) {
  return {
    id,
    email,
    name,
    isAdmin,
    language,
  };
}

const isProduction = process.env.NODE_ENV === "production";

const {
  handlers,
  auth: originalAuth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/enter",
  },

  cookies: {
    sessionToken: {
      name: `${isProduction ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // Secure cookies are only sent over HTTPS. In production, this must be true.
        secure: isProduction,
      },
    },
  },

  providers: [
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      // Sign-in is bound to a single-use verification token; verifyToken
      // checks expiry and consumes it.
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (typeof credentials?.token !== "string" || !credentials.token) {
          return null;
        }

        const result = await verifyToken(credentials.token);

        return result ? createUserObject(result.user) : null;
      },
    }),
    ...(process.env.ENABLE_TEST_AUTH === "true"
      ? [
          Credentials({
            id: "test-password",
            name: "Test Password",
            credentials: {
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.password === "test-password") {
                return createTestUserObject(
                  "test-user-id",
                  "test@example.com",
                  "Test User"
                );
              }
              return null;
            },
          }),
          Credentials({
            id: "password",
            name: "Password",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              const user = await prisma.user.findUnique({
                where: { email: credentials.email as string },
              });

              if (!user) {
                return null;
              }

              const hashedPassword = (user as { password?: string }).password;
              if (
                hashedPassword &&
                credentials.password &&
                typeof credentials.password === "string" &&
                (await bcrypt.compare(credentials.password, hashedPassword))
              ) {
                return createUserObject(user);
              }

              return null;
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      // On initial sign-in, capture the user id from the provider result.
      if (user && user.id) {
        token.id = user.id;
      }
      // Always refresh admin status and language from the DB. The previous
      // implementation only wrote these on sign-in, so a user promoted to admin
      // after their session was created — or whose token claims were reset by a
      // next-auth upgrade — kept a stale `isAdmin: false` token, hiding the
      // featured toggle and other admin UI until they signed out and back in.
      return refreshTokenClaims(token);
    },

    async session({ session, token }): Promise<Session> {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.language = token.language as string;
      }
      return session;
    },
  },
});

export async function createUser(email: string, name?: string) {
  return await prisma.user.create({
    data: {
      email,
      name,
      reportsEnabled: true,
      reportsFrequency: "DAILY",
    },
  });
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function createVerificationToken(email: string) {
  const token = generateSecureToken();
  const expires = new Date(Date.now() + MAGIC_LINK_TOKEN_TTL_MS);

  return await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });
}

/** Resolves a valid token's user without consuming the token */
export async function findTokenUser(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: verificationToken.identifier },
  });

  if (!user) {
    return null;
  }

  return { user, token: verificationToken };
}

export async function verifyToken(token: string) {
  const result = await findTokenUser(token);

  if (!result) {
    return null;
  }

  // Throws if a concurrent request already consumed the token
  await prisma.verificationToken.delete({
    where: { token },
  });

  return result;
}

/**
 * Gets the current session.
 *
 * Test mode: checks test-auth-session cookie first (for playwright tests)
 * Normal mode: uses NextAuth session from JWT cookie
 */
export async function auth() {
  if (process.env.ENABLE_TEST_AUTH === "true") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const testSessionToken = cookieStore.get("test-auth-session")?.value;

    if (testSessionToken) {
      try {
        const sessionData = JSON.parse(
          Buffer.from(testSessionToken, "base64").toString()
        );
        const expiresAt = new Date(sessionData.expires);
        if (expiresAt > new Date()) {
          return sessionData;
        }
      } catch {
        return originalAuth();
      }
    }
  }

  return originalAuth();
}

export { handlers, signIn, signOut };
