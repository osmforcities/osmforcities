import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { probeElementCount } from "@/lib/overpass/count-probe";
import { countProbeColumns } from "@/lib/dataset-count-probe";
import { submitTilesForDataset } from "@/lib/tiler/submit";
import { pollPendingTileJobs } from "@/lib/tiler/poll";
import { pingTiler, tilerEnabled } from "@/lib/tiler/client";
import { dueForRefreshWhere, NOT_TOO_LARGE } from "@/lib/dataset-retry";
import { trackEvent } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  CATALOG_FILTER,
  UNCATALOGED_FILTER,
} from "@/lib/dataset-catalog-filter";
import { createLogger } from "@/lib/logger";

const log = createLogger("update-datasets");
const tilerLog = createLogger("tiler");

// Uncataloged cache rows survive this long after creation so a visitor has time
// to save; deleted rows are recreated on the next visit (#482).
const CLEANUP_GRACE_DAYS = 30;

// Kept: bake or probe in flight, empty, too-large (its week-long wait)
const NO_MAP_WHERE: Prisma.DatasetWhereInput = {
  tilesServedJobId: null,
  AND: [NOT_TOO_LARGE],
  OR: [{ tilesState: "failed" }, { tilesState: null, dataCount: { gt: 0 } }],
};

type FailureKind = "claim" | "count_probe" | "submit";

// Deactivated rows never serve their geojson again — drop the payload. A sweep
// (rather than nulling at deactivation time) also heals rows deactivated
// before this existed.
async function clearGeojsonOfDeactivatedDatasets(): Promise<number> {
  const swept = await prisma.dataset.updateMany({
    where: { isActive: false, geojson: { not: Prisma.AnyNull } },
    data: { geojson: Prisma.JsonNull },
  });
  return swept.count;
}

async function deleteUnattendedDatasets(
  tilerConfigured: boolean
): Promise<number> {
  const graceCutoff = new Date(
    Date.now() - CLEANUP_GRACE_DAYS * 24 * 60 * 60 * 1000
  );
  const unattended: Prisma.DatasetWhereInput = {
    ...UNCATALOGED_FILTER,
    OR: [
      { createdAt: { lt: graceCutoff } },
      ...(tilerConfigured ? [NO_MAP_WHERE] : []),
    ],
  };
  const stale = await prisma.dataset.findMany({
    where: unattended,
    select: { id: true, cityName: true },
  });
  if (stale.length === 0) {
    return 0;
  }

  // Re-checked so a save or a bake landing between the two queries wins
  const { count } = await prisma.dataset.deleteMany({
    where: { id: { in: stale.map((d) => d.id) }, ...unattended },
  });
  log.info("Cleanup deleted uncataloged cache datasets", {
    count,
    datasets: stale.map((d) => `${d.id} (${d.cityName})`),
  });
  return count;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const expectedSecret = process.env.CRON_ROUTE_SECRET;

  if (!expectedSecret) {
    log.error("CRON_ROUTE_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (token !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const limit = parseInt(process.env.DATASET_UPDATE_LIMIT ?? "1");

    // Without a tiler to bake, a count probe would only spend each row's wait
    const tilerConfigured = tilerEnabled();
    const tilerUnreachable = tilerConfigured && !(await pingTiler());
    if (!tilerConfigured) {
      tilerLog.warn("TILER_URL not set, skipping dataset refresh");
    } else if (tilerUnreachable) {
      tilerLog.warn("Tiler unreachable, skipping dataset refresh this tick");
    }
    const refreshSkipped = !tilerConfigured || tilerUnreachable;

    // Scheduling is driven by lastAttempted (advanced on every attempt), not lastChecked
    // (advanced only on success) — otherwise a dataset that keeps failing keeps its old
    // lastChecked, stays most-stale, and is re-selected every run, starving all others.
    // The wait since lastAttempted grows with consecutive failures (dataset-retry).
    const datasetsToUpdate = refreshSkipped ? [] : await prisma.dataset.findMany({
      where: {
        isActive: true,
        ...dueForRefreshWhere(new Date()),
        // Only cataloged datasets (featured or saved) are worth refreshing —
        // uncataloged cache rows serve nobody and were ~91% of Overpass load (#482).
        ...CATALOG_FILTER,
        // A retired template's datasets can no longer be opened.
        template: { deprecatesAt: null },
      },
      include: {
        template: true,
        area: true,
      },
      take: limit,
      orderBy: [
        { lastAttempted: { sort: "asc", nulls: "first" } },
        { updatedAt: "asc" },
      ],
    });

    const results = {
      totalFound: datasetsToUpdate.length,
      successful: 0,
      failed: 0,
      errors: [] as { datasetId: string; kind: FailureKind; error: string }[],
    };
    const fail = (datasetId: string, kind: FailureKind, error: string) => {
      results.failed++;
      results.errors.push({ datasetId, kind, error });
    };

    // Tracking runs inline (not after(), whose callbacks were dropped) but is
    // collected and settled after the loop so a slow Umami call never delays the
    // next dataset. trackEvent is bounded (5s) and never rejects.
    const analyticsEvents: Promise<void>[] = [];

    // Advance lastAttempted before any work so the dataset yields its queue slot no matter what
    // happens next — this is what stops one bad dataset from jamming the queue (#431). Returns
    // false (skip this dataset only, never abort the batch) if the claim write itself fails.
    const claimAttempt = async (id: string): Promise<boolean> => {
      try {
        await prisma.dataset.update({
          where: { id },
          data: { lastAttempted: new Date() },
        });
        return true;
      } catch (claimError) {
        log.error("Failed to claim dataset, skipping this run", { datasetId: id, error: claimError });
        return false;
      }
    };

    // Surface persistently-failing datasets for admin review. lastAttempted was already advanced
    // by claimAttempt, so recording a failure here can never re-jam the queue (#431).
    const recordFailure = async (id: string, message: string) => {
      try {
        await prisma.dataset.update({
          where: { id },
          data: { consecutiveFailures: { increment: 1 }, lastError: message },
        });
      } catch (recordError) {
        log.error("Failed to record dataset failure", { datasetId: id, error: recordError });
      }
    };

    for (const dataset of datasetsToUpdate) {
      // Count a failed claim so results always reconcile (successful + failed === totalFound).
      if (!(await claimAttempt(dataset.id))) {
        fail(dataset.id, "claim", "failed to claim, skipped this run");
        continue;
      }

      try {
        const elementCount = await probeElementCount(
          dataset.areaId,
          dataset.template.overpassQuery,
          dataset.templateId
        );

        // Other rows keep their count and failure counter until the reconcile writes the bake's
        const hasNoDataToKeep = dataset.tilesState === "counting";
        if (hasNoDataToKeep) {
          await prisma.dataset.update({
            where: { id: dataset.id },
            data: {
              ...countProbeColumns(elementCount),
              updatedAt: new Date(),
              lastError: null,
            },
          });
        }

        const tiles = await submitTilesForDataset(dataset.id, elementCount);
        if (tiles.tilesState === "failed") {
          const message = tiles.tilesError ?? "tiler submit failed";
          await recordFailure(dataset.id, message);
          fail(dataset.id, "submit", message);
          continue;
        }

        analyticsEvents.push(
          trackEvent(
            ANALYTICS_EVENTS.DATASET_REFRESH_JOB,
            `/jobs/datasets/${dataset.id}/refresh`
          )
        );

        results.successful++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        log.error("Dataset refresh failed", {
          datasetId: dataset.id,
          error: errorMessage,
        });
        await recordFailure(dataset.id, errorMessage);
        fail(dataset.id, "count_probe", errorMessage);
      }
    }

    await Promise.allSettled(analyticsEvents);

    const tiles = await pollPendingTileJobs();

    const geojsonCleared = await clearGeojsonOfDeactivatedDatasets();
    const deleted = await deleteUnattendedDatasets(tilerConfigured);

    return NextResponse.json({
      success: true,
      message: "Dataset update task completed",
      data: {
        task: "update-datasets",
        limit,
        tilerConfigured,
        tilerUnreachable,
        ...results,
        tiles,
        cleanup: { deleted, geojsonCleared },
      },
    });
  } catch (error) {
    log.error("update-datasets task failed", { error });
    return NextResponse.json(
      {
        error: "Failed to execute update-datasets task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
