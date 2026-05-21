/**
 * Authentication hook for client-side login/signup
 *
 * IMPORTANT: This hook handles post-login redirects via window.location.href.
 * After successful login, users are redirected to /{locale}/dashboard.
 *
 * To change where users go after login, update the window.location.href lines below.
 * DO NOT modify the auth.ts redirect callback - it won't be used by this flow.
 */

import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export function useAuth() {
  const params = useParams();
  const locale = params.locale as string;

  /** Logs in user and redirects to /{locale}/dashboard */
  const login = async (email: string, password: string) => {
    const result = await signIn("password", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Invalid credentials");
    }

    window.location.href = `/${locale}/dashboard`;
  };

  /** Signs up user and redirects to /{locale}/dashboard */
  const signup = async (email: string, password: string, name: string) => {
    if (process.env.ENABLE_TEST_AUTH !== "true") {
      throw new Error(
        "Signup not available - test authentication disabled"
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(),
        reportsEnabled: true,
        reportsFrequency: "DAILY",
      },
    });

    const result = await signIn("password", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      window.location.href = `/${locale}/login`;
    } else {
      window.location.href = `/${locale}/dashboard`;
    }
  };

  return { login, signup };
}
