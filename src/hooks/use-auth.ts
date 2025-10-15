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

    window.location.href = `/${locale}`;
  };

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
      window.location.href = `/${locale}`;
    }
  };

  return { login, signup };
}
