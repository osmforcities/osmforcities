import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTileJob, tilerEnabled } from "@/lib/tiler/client";
import { reconcileDataset } from "@/lib/tiler/poll";
import { resumeCountProbeIfDue } from "@/lib/dataset-count-probe";

/**
 * The live stage of one dataset's bake — the wait page polls this
 * (browsers cannot reach the tiler, so the app proxies). When the tiler
 * reports done, the single-dataset reconcile runs right here so the open page
 * gets its map immediately instead of on the next cron tick (safe to race with
 * the cron: see reconcileDataset).
 *
 * Response: { state: "pending"|"done"|"failed"|"none",
 *             stage?, progress? }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await prisma.dataset.findUnique({
    where: { id },
    select: {
      id: true,
      tilesJobId: true,
      tilesState: true,
      lastAttempted: true,
      consecutiveFailures: true,
    },
  });
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  // Raw tiler errors stay operator-only: the page reads them server-side.
  const failedBody = { state: "failed" as const };

  if (dataset.tilesState === "counting") {
    return NextResponse.json(
      (await resumeCountProbeIfDue(dataset))
        ? { state: "pending", stage: "counting" }
        : failedBody
    );
  }
  if (dataset.tilesState === "done") return NextResponse.json({ state: "done" });
  if (dataset.tilesState === "failed") return NextResponse.json(failedBody);
  if (dataset.tilesState !== "pending" || !dataset.tilesJobId) {
    return NextResponse.json({ state: "none" });
  }
  if (!tilerEnabled()) {
    return NextResponse.json({ state: "pending" });
  }

  try {
    const job = await getTileJob(dataset.tilesJobId);
    const result = await reconcileDataset(
      { id: dataset.id, tilesJobId: dataset.tilesJobId },
      job
    );
    if (result.outcome === "completed") {
      return NextResponse.json({ state: "done" });
    }
    if (result.outcome === "failed") {
      return NextResponse.json(failedBody);
    }
    return NextResponse.json({
      state: "pending",
      stage: job?.state,
      progress: job?.progress ?? null,
    });
  } catch (error) {
    // Tiler unreachable or pull hiccup: stay pending, the wait page keeps polling
    console.error(`tiles-status failed for dataset ${id}:`, error);
    return NextResponse.json({ state: "pending" });
  }
}
