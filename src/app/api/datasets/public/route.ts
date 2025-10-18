import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const publicDatasets = await prisma.dataset.findMany({
      where: {
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

    return NextResponse.json(publicDatasets);
  } catch (error) {
    console.error("Error fetching public datasets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
