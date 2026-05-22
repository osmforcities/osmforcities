import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  try {
    const latestUpdate = await prisma.dataset.findFirst({
      where: { isActive: true, lastChecked: { not: null } },
      orderBy: { lastChecked: "desc" },
      select: { lastChecked: true },
    });

    const isDegraded =
      !latestUpdate?.lastChecked ||
      latestUpdate.lastChecked < twoHoursAgo;

    return NextResponse.json(
      {
        status: isDegraded ? "degraded" : "ok",
        timestamp: new Date().toISOString(),
        ...(isDegraded && { reason: "datasets not updating" }),
      },
      { status: isDegraded ? 503 : 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        reason: "database unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
