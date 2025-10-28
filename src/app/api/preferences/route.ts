import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user || null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPreferences = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        reportsEnabled: true,
        reportsFrequency: true,
      },
    });

    if (!userPreferences) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      preference: {
        reportsEnabled: userPreferences.reportsEnabled,
        reportsFrequency: userPreferences.reportsFrequency,
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
    const session = await auth();
    const user = session?.user || null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportsEnabled, reportsFrequency, language } = await request.json();

    // Get current user preferences to check what's changing
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        reportsEnabled: true,
        reportsFrequency: true,
        language: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if we need to update lastReportSent to prevent immediate email
    // Case 1: User is enabling reports (was false, now true)
    // Case 2: User is changing frequency while reports are enabled
    const shouldUpdateLastReportSent =
      (!currentUser.reportsEnabled && reportsEnabled) ||
      (currentUser.reportsEnabled && reportsEnabled &&
       currentUser.reportsFrequency !== reportsFrequency);

    const updateData: Prisma.UserUpdateInput = {
      reportsEnabled,
      reportsFrequency,
      language,
    };

    // Set lastReportSent to now to prevent immediate email sending
    if (shouldUpdateLastReportSent) {
      updateData.lastReportSent = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const response = NextResponse.json({
      preference: {
        reportsEnabled: updatedUser.reportsEnabled,
        reportsFrequency: updatedUser.reportsFrequency,
        language: updatedUser.language,
      },
    });

    // Set language preference cookie if language was updated
    if (language && language !== currentUser.language) {
      response.cookies.set("language-preference", language, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Error updating preference:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
