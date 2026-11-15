import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MAX_SAVES_PER_USER } from "@/lib/constants";

export async function getSaveLimit(
  userId: string,
  db: Prisma.TransactionClient = prisma,
): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { saveLimit: true },
  });
  return user?.saveLimit ?? MAX_SAVES_PER_USER;
}
