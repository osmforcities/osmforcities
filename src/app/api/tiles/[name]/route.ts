import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { tilesDir } from "@/lib/tiler/client";

/**
 * Serve pulled PMTiles archives from TILES_DIR with Range support — the
 * pmtiles protocol reads the archive by byte ranges, never whole. Filenames
 * are content-versioned ({datasetId}-{epoch}.pmtiles), hence immutable
 * caching. In production nginx can shadow this exact path.
 */

// Tiler job-id charset plus the extension; no separators, so no traversal.
const NAME_RE = /^[A-Za-z0-9._-]+\.pmtiles$/;

// bytes=start-end | bytes=start- | bytes=-suffix (single range only)
const RANGE_RE = /^bytes=(\d*)-(\d*)$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!NAME_RE.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "Invalid archive name" }, { status: 400 });
  }

  const filePath = path.join(tilesDir(), name);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "Archive not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = request.headers.get("range");
  let start = 0;
  let end = size - 1;
  let status = 200;

  if (range) {
    const match = RANGE_RE.exec(range);
    const from = match?.[1];
    const to = match?.[2];
    if (!match || (from === "" && to === "")) {
      headers["Content-Range"] = `bytes */${size}`;
      return new NextResponse(null, { status: 416, headers });
    }
    if (from === "") {
      // suffix range: last N bytes
      start = Math.max(0, size - Number(to));
    } else {
      start = Number(from);
      if (to !== "") end = Math.min(Number(to), size - 1);
    }
    if (start >= size || start > end) {
      headers["Content-Range"] = `bytes */${size}`;
      return new NextResponse(null, { status: 416, headers });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }

  headers["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(
    createReadStream(filePath, { start, end })
  ) as ReadableStream;
  return new NextResponse(stream, { status, headers });
}
