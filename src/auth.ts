import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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

function createUserObject(user: DatabaseUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    language: user.language || "en",
  };
}

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

const {
  handlers,
  auth: originalAuth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  pages: {
    signIn: "/enter",
  },

  providers: [
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId as string },
        });

        if (!user) {
          return null;
        }

        return createUserObject(user);
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
      if (user && user.id) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.language = user.language;
      }
      return token;
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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });
}

export async function verifyToken(token: string) {
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

  await prisma.verificationToken.delete({
    where: { token },
  });

  return { user, token: verificationToken };
}

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
