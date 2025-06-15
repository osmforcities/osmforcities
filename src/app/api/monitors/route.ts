import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { prisma } from "@/lib/db"; // shared Prisma instance
import { CreateMonitorSchema } from "@/schemas/monitor";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await findSessionByToken(sessionToken);
  if (!session || session.expiresAt < new Date())
    return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { templateId, cityName, cityBounds, countryCode, isPublic } =
    parsed.data;

  const template = await prisma.dataTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template)
    return NextResponse.json({ error: "Template not found" }, { status: 404 });

  try {
    const monitor = await prisma.monitor.create({
      data: {
        userId: session.user.id,
        templateId,
        cityName: cityName.trim(),
        cityBounds: cityBounds ?? null,
        countryCode: countryCode?.trim() ?? null,
        isPublic: isPublic ?? false,
      },
      include: { template: true },
    });

    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already have a monitor for this template and city" },
        { status: 409 }
      );
    }

    console.error("Error creating monitor:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
