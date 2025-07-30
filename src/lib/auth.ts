import { prisma } from "./db";
import { randomBytes } from "crypto";

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
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
