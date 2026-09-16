import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { DatasetStatsSchema } from "@/schemas/dataset";
import { tilesDir } from "./client";

const TILER_STATS_SCHEMA_VERSION = 1;

// The stats the app stores, plus the two the tiler keeps outside that blob.
// Both rules match the ones the dataset page enforces on the columns below.
const TilerStatsSchema = DatasetStatsSchema.extend({
  features: z.number().int().nonnegative(),
  bbox: z.array(z.number()).length(4).nullable(),
});

export async function readPulledStats(jobId: string): Promise<unknown> {
  const raw = await readFile(
    path.join(tilesDir(), `${jobId}.stats.json`),
    "utf8"
  );
  return JSON.parse(raw);
}

/** Map the tiler's stats.json onto Dataset columns, or null when unusable. */
export function tilerStatsToDatasetColumns(raw: unknown) {
  const schemaVersion = (raw as { schemaVersion?: number } | null)
    ?.schemaVersion;

  // The tiler bumps this only on removals and meaning changes.
  if (schemaVersion !== TILER_STATS_SCHEMA_VERSION) {
    console.error(
      `Unusable tiler stats (schemaVersion ${schemaVersion}); skipping stats fill`
    );
    return null;
  }

  // The dataset page parses these columns with no fallback, so a bad blob has
  // to fail here instead of there. Parsing also drops the tiler-only fields.
  const parsed = TilerStatsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "Tiler stats failed validation; skipping stats fill:",
      parsed.error.issues
    );
    return null;
  }

  const { features, bbox, ...stats } = parsed.data;
  return {
    // Prisma Json columns cannot hold the Dates zod coerced.
    stats: JSON.parse(JSON.stringify(stats)),
    dataCount: features,
    bbox: bbox ?? Prisma.JsonNull,
    lastEditedAt: stats.mostRecentElement,
    contributorsCount: stats.editorsCount,
    recentlyEditedCount: stats.recentActivity?.elementsEdited ?? null,
  };
}
