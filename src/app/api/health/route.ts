import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isFleetHealthy,
  MAX_STUCK_DATASETS,
  STUCK_FAILURE_THRESHOLD,
  TILER_DOWN_ALERT_MS,
} from "@/lib/dataset-health";
import { NOT_TOO_LARGE } from "@/lib/dataset-retry";
import { tilerDownForMs } from "@/lib/tiler/client";

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

    // Too-large rows retry weekly by design; counting them would hold health
    // down for as long as the area stays over the ceiling.
    const stuckCount = await prisma.dataset.count({
      where: {
        isActive: true,
        consecutiveFailures: { gt: STUCK_FAILURE_THRESHOLD },
        ...NOT_TOO_LARGE,
      },
    });

    const reasons = [
      !isFleetHealthy(reference) && "datasets not updating",
      stuckCount > MAX_STUCK_DATASETS && "datasets failing repeatedly",
      tilerDownForMs() > TILER_DOWN_ALERT_MS && "tiler unreachable",
    ].filter(Boolean);
    const isDegraded = reasons.length > 0;

    return NextResponse.json(
      {
        status: isDegraded ? "degraded" : "ok",
        timestamp: new Date().toISOString(),
        ...(isDegraded && { reason: reasons.join("; ") }),
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
