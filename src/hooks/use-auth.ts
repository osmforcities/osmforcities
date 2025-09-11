import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export function useAuth() {
  const params = useParams();
  const locale = params.locale as string;

  const login = async (email: string, password: string) => {
    const result = await signIn("password", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Invalid credentials");
    }

    // Redirect to home page after successful login
    window.location.href = `/${locale}`;
  };

  const signup = async (email: string, password: string, name: string) => {
    // Only allow when password authentication is enabled
    if (process.env.ENABLE_PASSWORD_AUTH !== "true") {
      throw new Error(
        "Signup not available - password authentication disabled"
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password before storing (secure even in test environment)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user with hashed password (for test environment only)
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword, // Store hashed password securely
        emailVerified: new Date(), // Auto-verify for testing
        reportsEnabled: true,
        reportsFrequency: "DAILY",
      },
    });

    // Auto-login after successful signup
    const result = await signIn("password", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // If auto-login fails, redirect to login page
      window.location.href = `/${locale}/login`;
    } else {
      // Redirect to home page after successful login
      window.location.href = `/${locale}`;
    }
  };

  return { login, signup };
}
