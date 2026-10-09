import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isTestAuthEnabled } from "@/lib/test-auth";
import { mockTilerState, resetMockTiler } from "@/lib/mocks/tiler";
import type { TileJob } from "@/lib/tiler/client";

/**
 * Fake tiler for Playwright: the calls src/lib/tiler/client.ts makes, plus
 * POST control so a spec moves a bake between stages. Every bake serves the
 * same committed fixture archive, and the fixture stats unless control set
 * the job's own.
 */

type Context = { params: Promise<{ path: string[] }> };

const FIXTURES = path.join(process.cwd(), "src/lib/mocks/tiler");
const notFound = () => new NextResponse(null, { status: 404 });

type ControlBody =
  | { reset: true }
  | { overpassCount: number }
  | ({ jobId: string; stats?: unknown } & Omit<TileJob, "id">);

export async function GET(_request: NextRequest, { params }: Context) {
  if (!isTestAuthEnabled()) return notFound();
  const [head, id, file] = (await params).path;
  if (head === "status" && !id) return NextResponse.json({ ok: true });
  const state = mockTilerState();
  const job = head === "jobs" && id ? state.jobs.get(id) : undefined;
  if (!job) return notFound();
  if (!file) return NextResponse.json(job);
  const stats = state.stats.get(id);
  if (file === "stats.json" && stats) return NextResponse.json(stats);
  if (file !== "output.pmtiles" && file !== "stats.json") return notFound();
  return new NextResponse(await readFile(path.join(FIXTURES, file)));
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!isTestAuthEnabled()) return notFound();
  const [head, ...rest] = (await params).path;
  if (rest.length) return notFound();
  const state = mockTilerState();

  if (head === "jobs") {
    const { id } = (await request.json()) as { id: string };
    if (!state.jobs.has(id)) state.jobs.set(id, { id, state: "queued" });
    return new NextResponse(null, { status: 202 });
  }
  if (head !== "control") return notFound();

  const body = (await request.json()) as ControlBody;
  if ("reset" in body) resetMockTiler();
  else if ("overpassCount" in body) state.overpassCount = body.overpassCount;
  else {
    const { jobId, stats, ...job } = body;
    state.jobs.set(jobId, { id: jobId, ...job });
    if (stats) state.stats.set(jobId, stats);
  }
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  if (!isTestAuthEnabled()) return notFound();
  const [head, id, ...rest] = (await params).path;
  if (head !== "jobs" || !id || rest.length) return notFound();
  mockTilerState().jobs.delete(id);
  return new NextResponse(null, { status: 204 });
}
