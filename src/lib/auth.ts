import { prisma } from "./db";
import { randomBytes } from "crypto";

export async function createUser(email: string, name?: string) {
  return await prisma.user.create({
    data: {
      email,
      name,
    },
  });
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function createVerificationToken(email: string, userId?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return await prisma.verificationToken.create({
    data: {
      token,
      email,
      userId,
      expiresAt,
    },
  });
}

export async function verifyToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (
    !verificationToken ||
    verificationToken.used ||
    verificationToken.expiresAt < new Date()
  ) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { id: verificationToken.id },
    data: { used: true },
  });

  return verificationToken;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

export async function findSessionByToken(token: string) {
  return await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function deleteSession(token: string) {
  await prisma.session.delete({
    where: { token },
  });
}
