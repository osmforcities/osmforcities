import {
  countOverpassElements,
  OverpassTimeoutError,
} from "@/lib/overpass/transport";
import { fillAreaQuery } from "@/lib/overpass/area-query";
import { prisma } from "@/lib/db";
import { LARGE_JOB_MAXSIZE_BYTES } from "@/lib/tiler/client";
import { TIMEOUT_VERDICT_TTL_MINUTES } from "@/lib/constants";

/** "unknown": Overpass gave up counting, so the tiler decides on over-cap budgets */
export type ElementCount = number | "unknown";

async function recordTimeoutVerdict(
  areaId: number,
  templateId: string
): Promise<void> {
  const data = { status: "timeout", checkedAt: new Date() };
  await prisma.areaSizeCheck.upsert({
    where: { areaId_templateId: { areaId, templateId } },
    create: { areaId, templateId, ...data },
    update: data,
  });
}

async function hasFreshTimeoutVerdict(
  areaId: number,
  templateId: string
): Promise<boolean> {
  const check = await prisma.areaSizeCheck.findUnique({
    where: { areaId_templateId: { areaId, templateId } },
  });
  return (
    check?.status === "timeout" &&
    Date.now() - check.checkedAt.getTime() <=
      TIMEOUT_VERDICT_TTL_MINUTES * 60 * 1000
  );
}

// Overpass [timeout:N], in seconds.
const RAISED_TIMEOUT_SECONDS = 180;
// Client-side abort, in milliseconds. Longer than the server budget so
// Overpass reports its own timeout before we hang up.
const RAISED_CLIENT_TIMEOUT_MS = 200_000;

function withRaisedBudgets(query: string): string {
  const settings = `[timeout:${RAISED_TIMEOUT_SECONDS}][maxsize:${LARGE_JOB_MAXSIZE_BYTES}]`;
  return /\[timeout:\d+\]/.test(query)
    ? query.replace(/\[timeout:\d+\]/, settings)
    : query.replace("[out:json]", `[out:json]${settings}`);
}

export async function probeElementCount(
  areaId: number,
  rawQuery: string,
  templateId: string
): Promise<ElementCount> {
  if (await hasFreshTimeoutVerdict(areaId, templateId)) return "unknown";

  const query = fillAreaQuery(rawQuery, areaId);
  try {
    return await countOverpassElements(query);
  } catch (error) {
    if (!(error instanceof OverpassTimeoutError)) throw error;
  }
  // Metro counts and areas Overpass has never evaluated outgrow the template's own budgets
  try {
    return await countOverpassElements(
      withRaisedBudgets(query),
      RAISED_CLIENT_TIMEOUT_MS
    );
  } catch (retryError) {
    if (!(retryError instanceof OverpassTimeoutError)) throw retryError;
    await recordTimeoutVerdict(areaId, templateId);
    return "unknown";
  }
}
