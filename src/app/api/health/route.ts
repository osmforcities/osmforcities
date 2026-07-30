import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// The update-datasets cron refreshes each dataset on roughly this cadence
// (a dataset becomes eligible once its lastAttempted is older than this window;
// see api/tasks/update-datasets). The fleet refreshes in a daily burst then sits
// idle, so a healthy system only produces a *successful* check about once per
// interval — health must be judged against that cadence, not a tighter one.
const REFRESH_INTERVAL_HOURS = 24;
// Grace on top of the interval before we call the pipeline stalled: absorbs the
// idle gap between bursts plus cron/Overpass jitter. Peak healthy age of the
// newest successful check is ~the idle gap (< interval); this margin keeps a
// healthy idle stretch from tripping a false alarm.
const GRACE_HOURS = 6;
const STALE_THRESHOLD_MS =
  (REFRESH_INTERVAL_HOURS + GRACE_HOURS) * 60 * 60 * 1000;

export async function GET() {
  const staleBefore = new Date(Date.now() - STALE_THRESHOLD_MS);

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

    const isDegraded = reference !== null && reference < staleBefore;

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
