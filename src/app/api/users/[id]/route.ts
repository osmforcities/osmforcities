import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const UserUpdateSchema = z
  .object({
    isAdmin: z.boolean(),
    saveLimit: z.number().int().positive().nullable(),
  })
  .partial()
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id } = await params;
  // Self-demotion is the only way the last admin could be removed from the app.
  if (id === session.user.id && parsed.data.isAdmin === false) {
    return NextResponse.json({ error: "cannot_remove_own_admin" }, { status: 400 });
  }

  const { count } = await prisma.user.updateMany({
    where: { id },
    data: parsed.data,
  });
  if (count === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ id, ...parsed.data });
}
