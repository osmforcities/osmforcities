import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      preference: {
        reportsEnabled: user.reportsEnabled,
        reportsFrequency: user.reportsFrequency,
      },
    });
  } catch (error) {
    console.error("Error fetching preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch preference" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportsEnabled, reportsFrequency, language } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        reportsEnabled,
        reportsFrequency,
        language,
      },
    });

    return NextResponse.json({
      preference: {
        reportsEnabled: updatedUser.reportsEnabled,
        reportsFrequency: updatedUser.reportsFrequency,
        language: updatedUser.language,
      },
    });
  } catch (error) {
    console.error("Error updating preference:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
