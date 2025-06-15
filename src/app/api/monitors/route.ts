import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await findSessionByToken(sessionToken);

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { templateId, cityName, cityBounds, countryCode, isPublic } =
      await request.json();

    if (!templateId || !cityName) {
      return NextResponse.json(
        { error: "Template ID and city name are required" },
        { status: 400 }
      );
    }

    // Check if template exists
    const template = await prisma.dataTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create the monitor
    const monitor = await prisma.monitor.create({
      data: {
        userId: session.user.id,
        templateId,
        cityName: cityName.trim(),
        cityBounds: cityBounds || null,
        countryCode: countryCode?.trim() || null,
        isPublic: isPublic || false,
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json(monitor, { status: 201 });
  } catch (error) {
    console.error("Error creating monitor:", error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "You already have a monitor for this template and city" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
