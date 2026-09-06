"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type TilesStatus = {
  state: "pending" | "done" | "failed" | "none";
  stage?: string;
  progress?: { stage: string; bytes?: number; pct?: number } | null;
  error?: string | null;
  tooLarge?: boolean;
};

const POLL_MS = 4000;

/**
 * Poll the tiles-status proxy while a bake runs; refresh the page the moment
 * the archive lands (the proxy reconciles on demand, so "done" means the
 * pulled data is already in the row). Shared by the full processing panel
 * (tiles-only datasets) and the small refresh notice (datasets still
 * rendering their previous data).
 */
function useTilesStatus(datasetId: string): TilesStatus | null {
  const router = useRouter();
  const [status, setStatus] = useState<TilesStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const response = await fetch(`/api/datasets/${datasetId}/tiles-status`);
        if (!response.ok) throw new Error(String(response.status));
        const body: TilesStatus = await response.json();
        if (cancelled) return;
        setStatus(body);
        if (body.state === "done") {
          router.refresh();
          return;
        }
        if (body.state === "failed" || body.state === "none") return;
      } catch {
        // Transient (network blip, dev-server reload) — keep polling
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [datasetId, router]);

  return status;
}

/**
 * Fills the map area while a tile bake runs: live stage + progress. Without
 * this, a tiles-only dataset (no geojson at all) would sit on an eternal
 * empty state.
 */
export function TilesProcessingPanel({ datasetId }: { datasetId: string }) {
  const t = useTranslations("DatasetPage");
  const status = useTilesStatus(datasetId);

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
          <p className="text-sm text-gray-600">
            {status.tooLarge ? t("tilesFailedTooLarge") : status.error}
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

/**
 * One-line variant for datasets that keep rendering their previous data
 * during a refresh bake: shows the pending notice, flips the page when the
 * new data lands, downgrades to a quiet failure line if the bake fails.
 */
export function TilesPendingNotice({ datasetId }: { datasetId: string }) {
  const t = useTranslations("DatasetPage");
  const status = useTilesStatus(datasetId);

  if (status?.state === "failed") {
    return (
      <p className="mt-2 text-xs text-orange-700">
        {t("tilesRefreshFailedNotice")}
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-gray-500">{t("tilesProcessingNotice")}</p>
  );
}
