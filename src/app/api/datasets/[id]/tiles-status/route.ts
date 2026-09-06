import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTileJob, tilerEnabled } from "@/lib/tiler/client";
import { reconcileDataset } from "@/lib/tiler/poll";

/**
 * Live tile-bake status for one dataset — the processing panel polls this
 * (browsers cannot reach the tiler, so the app proxies). When the tiler
 * reports done, the single-dataset reconcile runs right here so the watcher
 * gets tiles immediately instead of on the next cron tick (safe to race with
 * the cron: see reconcileDataset).
 *
 * Response: { state: "pending"|"done"|"failed"|"none",
 *             stage?, progress?, error?, tooLarge? }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await prisma.dataset.findUnique({
    where: { id },
    select: { id: true, tilesJobId: true, tilesState: true, tilesError: true },
  });
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const failedBody = (error: string | null) => ({
    state: "failed" as const,
    error,
    tooLarge: error?.startsWith("too_large") ?? false,
  });

  if (dataset.tilesState === "done") return NextResponse.json({ state: "done" });
  if (dataset.tilesState === "failed") {
    return NextResponse.json(failedBody(dataset.tilesError));
  }
  if (dataset.tilesState !== "pending" || !dataset.tilesJobId) {
    return NextResponse.json({ state: "none" });
  }
  if (!tilerEnabled()) {
    return NextResponse.json({ state: "pending" });
  }

  try {
    const job = await getTileJob(dataset.tilesJobId);
    const outcome = await reconcileDataset(
      { id: dataset.id, tilesJobId: dataset.tilesJobId },
      job
    );
    if (outcome === "completed") return NextResponse.json({ state: "done" });
    if (outcome === "failed") {
      const row = await prisma.dataset.findUnique({
        where: { id },
        select: { tilesError: true },
      });
      return NextResponse.json(failedBody(row?.tilesError ?? null));
    }
    return NextResponse.json({
      state: "pending",
      stage: job?.state,
      progress: job?.progress ?? null,
    });
  } catch (error) {
    // Tiler unreachable or pull hiccup: stay pending, the panel keeps polling
    console.error(`tiles-status failed for dataset ${id}:`, error);
    return NextResponse.json({ state: "pending" });
  }
}
