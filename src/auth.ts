import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          language: user.language,
        };
      },
    }),
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
