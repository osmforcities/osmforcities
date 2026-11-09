"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
const STAGES = ["counting", "queued", "fetching", "converting", "baking"] as const;
type Stage = (typeof STAGES)[number];

function isStage(value: unknown): value is Stage {
  return STAGES.includes(value as Stage);
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
  categorySlug: string;
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
  categorySlug,
  mood,
  coldAfterMs = COUNT_REQUEST_TIMEOUT_MS,
  notify,
}: DatasetWaitPageProps) {
  const t = useTranslations("DatasetPage");
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

  const stageLabel =
    stage === "counting"
      ? t(cold ? "tilesStageCountingCold" : "tilesStageCounting")
      : stage === "fetching"
        ? t("tilesStageFetching", { mb: mb ?? 0 })
        : stage === "converting"
          ? t("tilesStageConverting", { pct: Math.round(pct ?? 0) })
          : stage === "baking"
            ? t("tilesStageBaking", { pct: Math.round(pct ?? 0) })
            : t("tilesStageQueued");

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
        areaId={areaId}
        categorySlug={categorySlug}
        tone={failure ? "warning" : "processing"}
        title={t("datasetInArea", { dataset: templateName, area: areaName })}
        lead={failure?.lead}
        // The stage label says everything a waiting person needs; a sentence
        // under it only repeated it.
        progress={
          !failure && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-lg font-semibold text-gray-900 tabular-nums">
                {stageLabel}
              </p>
              <ProgressBar value={pct} label={stageLabel} />
            </div>
          )
        }
        description={failure?.description}
        action={notify}
      />
    </div>
  );
}
