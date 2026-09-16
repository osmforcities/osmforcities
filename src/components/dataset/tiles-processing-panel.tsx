"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type TilesStatus = {
  state: "pending" | "done" | "failed" | "none";
  stage?: string;
  progress?: { bytes?: number; pct?: number } | null;
  error?: string | null;
  tooLarge?: boolean;
};

const POLL_MS = 4000;

/**
 * Fills the map area while a tile bake runs: live stage + progress from the
 * tiles-status proxy, page refresh the moment the archive is ready. Without
 * this, a tiles-only dataset (no geojson at all) would sit on an eternal
 * empty state.
 */
export function TilesProcessingPanel({ datasetId }: { datasetId: string }) {
  const t = useTranslations("DatasetPage");
  const router = useRouter();

  // Poll while the job runs; stop on a terminal state. A fetch error leaves
  // data unset, so the interval keeps firing through transient blips.
  const { data: status } = useQuery<TilesStatus>({
    queryKey: ["tiles-status", datasetId],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${datasetId}/tiles-status`);
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    },
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === undefined || state === "pending" ? POLL_MS : false;
    },
  });

  useEffect(() => {
    if (status?.state === "done") router.refresh();
  }, [status?.state, router]);

  // "none" means no tile job exists for this dataset — nothing to narrate.
  // Unreachable via full-map's gating (panel mounts only on pending/failed),
  // but a frozen "queued" panel would be worse than an empty map area.
  if (status?.state === "none") return null;

  const stage = status?.stage ?? "queued";
  const pct = status?.progress?.pct;
  const mb = status?.progress?.bytes
    ? Math.round(status.progress.bytes / (1024 * 1024))
    : null;

  const stageLabel =
    stage === "fetching"
      ? t("tilesStageFetching", { mb: mb ?? 0 })
      : stage === "converting"
        ? t("tilesStageConverting", { pct: Math.round(pct ?? 0) })
        : stage === "baking"
          ? t("tilesStageBaking", { pct: Math.round(pct ?? 0) })
          : t("tilesStageQueued");

  if (status?.state === "failed") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div
          className="w-full max-w-sm space-y-3 rounded-lg border border-gray-200 bg-white p-6 text-center"
          data-testid="tiles-failed-panel"
        >
          <h3 className="font-semibold text-gray-900">{t("tilesFailedTitle")}</h3>
          {/* Raw tiler errors are operator material (kept in tilesError and
              shown on the admin page) — end users get localized copy only. */}
          <p className="text-sm text-gray-600">
            {status.tooLarge
              ? t("tilesFailedTooLarge")
              : t("tilesFailedGeneric")}
          </p>
          <p className="text-xs text-gray-500">{t("tilesFailedRetryNote")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div
        className="w-full max-w-sm space-y-3 rounded-lg border border-gray-200 bg-white p-6 text-center"
        data-testid="tiles-processing-panel"
        aria-live="polite"
      >
        <h3 className="font-semibold text-gray-900">
          {t("tilesProcessingTitle")}
        </h3>
        <p className="text-sm text-gray-600">{stageLabel}</p>
        <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
          {typeof pct === "number" ? (
            <div
              className="h-full bg-olive-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
            />
          ) : (
            <div className="h-full w-1/3 animate-pulse rounded bg-olive-500" />
          )}
        </div>
      </div>
    </div>
  );
}
