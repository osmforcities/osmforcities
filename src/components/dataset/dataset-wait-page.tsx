"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DatasetNoMapPage } from "@/components/ui/dataset-no-map-page";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  COUNT_REQUEST_TIMEOUT_MS,
  SIZE_CHECK_TIMEOUT_TTL_MINUTES,
} from "@/lib/constants";

type TilesStatus = {
  state: "pending" | "done" | "failed" | "none";
  stage?: string;
  progress?: { bytes?: number; pct?: number } | null;
};

const POLL_MS = 4000;

/**
 * The stages a person waits through. Counting is the app's own size probe,
 * before the tiler has a job at all; the rest are the tiler's stages. No step
 * count is shown: a bake can be interrupted and start over.
 */
const STAGES = {
  counting: { name: "tilesStageCounting", note: "tilesNoteCounting" },
  queued: { name: "tilesStageQueued", note: "tilesNoteQueued" },
  fetching: { name: "tilesStageFetching", note: "tilesNoteFetching" },
  converting: { name: "tilesStageConverting", note: "tilesNoteConverting" },
  baking: { name: "tilesStageBaking", note: "tilesNoteBaking" },
} as const;
type Stage = keyof typeof STAGES;

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && value in STAGES;
}

type DatasetWaitPageProps = {
  /**
   * Absent only while counting with the tiles-only lane off, where the row
   * does not exist until the count passes.
   */
  datasetId?: string;
  templateName: string;
  areaName: string;
  areaId: number;
  categoryHref: string;
  /**
   * Counting is the probe before any bake; baking polls the tiler.
   * Failed is retried by a later visit (or tick, once saved); timedOut is
   * Overpass giving up on the count (or, with the lane off, the feature
   * fetch).
   */
  mood: "counting" | "baking" | "failed" | "timedOut";
  /** Overrides when counting switches to the large-area label. */
  coldAfterMs?: number;
  /** The save-and-email button. Nothing renders in its place without it. */
  notify?: ReactNode;
};

/**
 * The whole page while a dataset has no map to show: the count probe is
 * running, the bake is running, or one of them failed in a way that can
 * still succeed later. A permanent refusal is a different screen
 * (DatasetTooLargeState) picked on the server, because only the server reads
 * the tiler's error.
 */
export function DatasetWaitPage({
  datasetId,
  templateName,
  areaName,
  areaId,
  categoryHref,
  mood,
  coldAfterMs = COUNT_REQUEST_TIMEOUT_MS,
  notify,
}: DatasetWaitPageProps) {
  const t = useTranslations("DatasetPage");
  const format = useFormatter();
  const router = useRouter();
  const baking = mood === "baking";
  const [cold, setCold] = useState(false);

  useEffect(() => {
    if (mood !== "counting") return;
    const timer = setTimeout(() => setCold(true), coldAfterMs);
    return () => clearTimeout(timer);
  }, [mood, coldAfterMs]);

  // A fetch error leaves data unset, so the interval keeps firing through
  // transient blips and stops only on a terminal state.
  const { data: status } = useQuery<TilesStatus>({
    queryKey: ["tiles-status", datasetId],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${datasetId}/tiles-status`);
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    },
    enabled: baking || (mood === "counting" && !!datasetId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === undefined || state === "pending" ? POLL_MS : false;
    },
  });

  const probeFinished = mood === "counting" && status?.stage !== "counting";
  const leftThisScreen =
    !!status && (status.state !== "pending" || probeFinished);
  // Only the server can tell a permanent refusal from one that will be retried
  useEffect(() => {
    if (leftThisScreen) router.refresh();
  }, [leftThisScreen, router]);

  const reported = status?.stage;
  // A finished bake still reads pending while the app pulls its archive, and
  // the page keeps showing until the refresh to the map lands
  const bakeLanded = reported === "done" || status?.state === "done";
  const stage: Stage =
    mood === "counting"
      ? "counting"
      : bakeLanded
        ? "baking"
        : isStage(reported)
          ? reported
          : "queued";
  // Fetching reports bytes, not a percentage: the total is unknown until the
  // fetch ends, so only the last two stages give the bar a value.
  const pct = bakeLanded
    ? 100
    : stage === "converting" || stage === "baking"
      ? (status?.progress?.pct ?? 0)
      : undefined;
  const mb = status?.progress?.bytes
    ? Math.round(status.progress.bytes / (1024 * 1024))
    : null;

  const stageName = t(
    stage === "counting" && cold ? "tilesStageCountingCold" : STAGES[stage].name
  );
  const stagePercent =
    stage === "converting" || stage === "baking"
      ? format.number(Math.round(pct ?? 0) / 100, { style: "percent" })
      : null;

  // One plain sentence on what the stage does. The megabytes live here, not
  // in the label, so the label stays one short line.
  const stageNote = t(STAGES[stage].note, { mb: mb ?? 0 });

  const failure =
    mood === "timedOut"
      ? {
          lead: t("stateCountTimedOut"),
          description: t("countTimedOutDescription", {
            minutes: SIZE_CHECK_TIMEOUT_TTL_MINUTES,
          }),
        }
      : mood === "failed"
        ? { lead: t("stateBakeFailed"), description: t("tilesFailedDescription") }
        : null;

  return (
    <div data-testid={`dataset-${mood}-page`}>
      <DatasetNoMapPage
        categoryHref={categoryHref}
        areaId={areaId}
        tone={failure ? "warning" : "neutral"}
        title={t("datasetInArea", { dataset: templateName, area: areaName })}
        lead={failure?.lead}
        progress={
          !failure && (
            <div className="space-y-3">
              <ProgressBar value={pct} label={stageName} />
              {/* Only the stage name is announced. The percentage and the
                  note's megabytes change on every poll, and the bar already
                  carries the percentage. The live span stays mounted across
                  stages, a freshly mounted one is not announced. */}
              <p className="text-lg font-semibold text-gray-900 tabular-nums">
                <span aria-live="polite">{stageName}</span>
                {stagePercent && (
                  <span className="ms-2 text-gray-500">{stagePercent}</span>
                )}
              </p>
              <p className="text-sm text-gray-600 tabular-nums">{stageNote}</p>
            </div>
          )
        }
        description={failure?.description}
        action={notify}
      />
    </div>
  );
}
