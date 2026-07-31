import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFleetHealthy } from "@/lib/dataset-health";

export async function GET() {
  try {
    // "Has ANY active dataset refreshed successfully recently?" — the newest
    // lastChecked across the fleet. lastChecked advances only on success, so:
    //  - one permanently-failing dataset can't drag health down (others succeed;
    //    its failure surfaces via consecutiveFailures/lastError in admin), and
    //  - a total outage (cron dead, DB down, Overpass down → nothing succeeds)
    //    ages the newest success past the window and degrades health.
    const newestChecked = await prisma.dataset.findFirst({
      where: { isActive: true, lastChecked: { not: null } },
      orderBy: { lastChecked: "desc" },
      select: { lastChecked: true },
    });

    let reference = newestChecked?.lastChecked ?? null;

    if (!reference) {
      // Nothing has ever refreshed successfully. Only degrade once the oldest
      // active dataset has waited past the window — a fresh instance gets grace
      // to run its first cycle. No active datasets at all => nothing to do => ok.
      const oldestActive = await prisma.dataset.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      reference = oldestActive?.createdAt ?? null;
    }

    const isDegraded = !isFleetHealthy(reference);

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
