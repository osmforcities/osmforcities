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
 * The steps a person waits through, in order. Counting is the app's own size
 * probe, before the tiler has a job at all; the rest are the tiler's stages.
 */
const STEPS = {
  counting: 1,
  queued: 2,
  fetching: 3,
  converting: 4,
  baking: 5,
} as const;
type Stage = keyof typeof STEPS;
const TOTAL_STEPS = 5;

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && value in STEPS;
}

type DatasetWaitPageProps = {
  /** Absent while counting: the row does not exist until the count passes. */
  datasetId?: string;
  templateName: string;
  areaName: string;
  areaId: number;
  /**
   * Counting is the probe before any bake; baking polls the tiler.
   * Failed will be retried by the next scheduled update; timedOut is a count
   * that gave up before any row existed.
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

  // Only the bake has anything to poll. A fetch error leaves data unset, so
  // the interval keeps firing through transient blips and stops only on a
  // terminal state.
  const { data: status } = useQuery<TilesStatus>({
    queryKey: ["tiles-status", datasetId],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${datasetId}/tiles-status`);
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    },
    enabled: baking,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === undefined || state === "pending" ? POLL_MS : false;
    },
  });

  useEffect(() => {
    // Both terminal states belong to a different screen, and only the server
    // can tell a permanent refusal from one that will be retried.
    if (status?.state === "done" || status?.state === "failed") router.refresh();
  }, [status?.state, router]);

  const reported = status?.stage;
  const stage: Stage =
    mood === "counting" ? "counting" : isStage(reported) ? reported : "queued";
  // Fetching reports bytes, not a percentage: the total is unknown until the
  // fetch ends, so only the last two stages give the bar a value.
  const pct =
    stage === "converting" || stage === "baking"
      ? status?.progress?.pct
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
        backLabel={t("backToAreaLabel", { area: areaName })}
        tone={failure ? "warning" : "processing"}
        title={t("datasetInArea", { dataset: templateName, area: areaName })}
        lead={failure?.lead}
        // The stage label and step say everything a waiting person needs;
        // a sentence under them only repeated it.
        progress={
          !failure && (
            <div className="space-y-2" aria-live="polite">
              <p className="text-sm text-gray-900">{stageLabel}</p>
              <ProgressBar value={pct} label={stageLabel} />
              <p className="text-sm text-gray-500">
                {t("stepLine", {
                  step: String(STEPS[stage]),
                  total: String(TOTAL_STEPS),
                })}
              </p>
            </div>
          )
        }
        description={failure?.description}
        action={notify}
      />
    </div>
  );
}
