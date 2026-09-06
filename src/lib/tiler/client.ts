import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Client for the overpass-pmtiler service (see overpass-pmtiler/API.md).
 *
 * The integration is additive: the app's own Overpass fetch stays the source
 * of truth for geojson/stats, so every helper here degrades gracefully when
 * the tiler is unreachable. TILER_URL unset disables the whole integration
 * (the kill switch).
 */

export type TileJobState =
  | "queued"
  | "fetching"
  | "converting"
  | "baking"
  | "done"
  | "failed";

export type TileJob = {
  id: string;
  state: TileJobState;
  startedAt?: string;
  error?: string;
  errorKind?: string;
  /** Present only while a stage runs: {stage, bytes|pct|features|total}. */
  progress?: {
    stage: string;
    bytes?: number;
    pct?: number;
    features?: number;
    total?: number;
  };
};

/** Columns written next to snapshotDatasetColumns() at snapshot time. */
export type TilesColumns = {
  tilesJobId?: string;
  tilesState?: string;
  tilesError?: string | null;
};

const REQUEST_TIMEOUT_MS = 30_000;

function tilerUrl(): string | null {
  return process.env.TILER_URL || null;
}

export function tilerEnabled(): boolean {
  return tilerUrl() !== null;
}

export function tilesDir(): string {
  return process.env.TILES_DIR || "./data/tiles";
}

/** Tiler job ids must match [A-Za-z0-9._-]{1,128}; cuid + epoch does. */
export function newTileJobId(datasetId: string): string {
  return `${datasetId}-${Math.floor(Date.now() / 1000)}`;
}

export async function submitTileJob(input: {
  id: string;
  query: string;
  filterableTags?: string[];
}): Promise<void> {
  const response = await fetch(`${tilerUrl()}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // 202 = accepted, 200 = idempotent resubmit of a known id; both fine.
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Tiler submit failed: ${response.status} ${body}`.trim());
  }
}

/** null when the job is unknown (404 — swept or never submitted). */
export async function getTileJob(id: string): Promise<TileJob | null> {
  const response = await fetch(`${tilerUrl()}/jobs/${id}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Tiler job lookup failed: ${response.status}`);
  }
  return (await response.json()) as TileJob;
}

async function downloadToFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Tiler download failed: ${response.status} for ${url}`);
  }
  // Temp file + rename so a crashed pull never leaves a partial archive
  // where the serving route would find it.
  const temp = path.join(
    path.dirname(destination),
    `.tmp-${path.basename(destination)}`
  );
  await pipeline(
    Readable.fromWeb(response.body as import("stream/web").ReadableStream),
    createWriteStream(temp)
  );
  await rename(temp, destination);
}

/**
 * Pull output.pmtiles and stats.json for a done job into TILES_DIR as
 * `{jobId}.pmtiles` / `{jobId}.stats.json`.
 */
export async function downloadTileOutputs(id: string): Promise<void> {
  const dir = tilesDir();
  await mkdir(dir, { recursive: true });
  await downloadToFile(
    `${tilerUrl()}/jobs/${id}/output.pmtiles`,
    path.join(dir, `${id}.pmtiles`)
  );
  await downloadToFile(
    `${tilerUrl()}/jobs/${id}/stats.json`,
    path.join(dir, `${id}.stats.json`)
  );
}

/** Ack a pulled job so the tiler frees its spool. 404 (already swept) is fine. */
export async function ackTileJob(id: string): Promise<void> {
  const response = await fetch(`${tilerUrl()}/jobs/${id}`, {
    method: "DELETE",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Tiler ack failed: ${response.status}`);
  }
}

/**
 * Delete this dataset's archives beyond the two newest (current + previous,
 * the #487 retention rule). Filenames embed the submit epoch, so
 * lexicographic-by-epoch sorting is chronological.
 */
export async function pruneTileArchives(datasetId: string): Promise<void> {
  let names: string[];
  try {
    names = await readdir(tilesDir());
  } catch {
    return; // no dir yet, nothing to prune
  }
  const epochs = names
    .filter((n) => n.startsWith(`${datasetId}-`) && n.endsWith(".pmtiles"))
    .map((n) => n.slice(datasetId.length + 1, -".pmtiles".length))
    .filter((e) => /^\d+$/.test(e))
    .sort((a, b) => Number(b) - Number(a));
  for (const epoch of epochs.slice(2)) {
    for (const suffix of [".pmtiles", ".stats.json"]) {
      await unlink(path.join(tilesDir(), `${datasetId}-${epoch}${suffix}`)).catch(
        () => {}
      );
    }
  }
}

/**
 * Submit a bake job for a fresh snapshot and return the Dataset columns to
 * persist alongside snapshotDatasetColumns(). Never throws: a tiler outage
 * must not fail the snapshot — the state lands in tilesState/tilesError and
 * the next snapshot resubmits.
 */
export async function submitTilesColumns(
  datasetId: string,
  query: string,
  filterableTags: string[]
): Promise<TilesColumns> {
  if (!tilerEnabled()) return {};
  const id = newTileJobId(datasetId);
  try {
    await submitTileJob({ id, query, filterableTags });
    return { tilesJobId: id, tilesState: "pending", tilesError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Tiler submit failed for dataset ${datasetId}: ${message}`);
    return { tilesState: "failed", tilesError: message };
  }
}
