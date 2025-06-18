import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const publicMonitors = await prisma.monitor.findMany({
      where: {
        isPublic: true,
        isActive: true,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
            countryCode: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    });

    return NextResponse.json(publicMonitors);
  } catch (error) {
    console.error("Error fetching public monitors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
