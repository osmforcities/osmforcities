"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { Feature, FeatureCollection } from "geojson";
import type { Dataset } from "@/schemas/dataset";
import { Link } from "@/i18n/navigation";
import { resolveAreaName } from "@/lib/area-name";
import { DatasetMapWrapper, type DatasetFullMapHandle } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/dataset-info-panel";
import { DatasetPanelStats } from "@/components/dataset/dataset-panel-stats";
import { DatasetTimestamps } from "@/components/dataset/dataset-timestamps";
import { DatasetActionsSection } from "@/components/dataset/dataset-actions-section";
import { FeatureDetailPanel } from "@/components/dataset/feature-detail-panel";

type DatasetInteractiveSectionProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
  savedCount?: number;
  saveLimit?: number;
};

export function DatasetInteractiveSection({
  dataset,
  boundary,
  savedCount = 0,
  saveLimit,
}: DatasetInteractiveSectionProps) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [lastChecked, setLastChecked] = useState(dataset.lastChecked);
  const mapRef = useRef<DatasetFullMapHandle>(null);
  const t = useTranslations("DatasetPage");
  const locale = useLocale();
  const areaName = resolveAreaName(dataset.area, locale);

  useEffect(() => {
    // Expose test hook in test mode or development
    if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__triggerFeatureSelect =
        setSelectedFeature;
      return () => {
        delete (window as unknown as Record<string, unknown>).__triggerFeatureSelect;
      };
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {/* Side Panel */}
      <aside className="bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-6 flex flex-col lg:w-96 lg:flex-shrink-0 lg:h-full">
        {selectedFeature ? (
          <FeatureDetailPanel
            feature={selectedFeature}
            onBack={() => {
              setSelectedFeature(null);
              mapRef.current?.deselectFeature();
            }}
          />
        ) : (
          <div
            className="flex flex-col flex-1 min-h-0"
            data-testid="dataset-sidebar-default"
          >
            {/* Section 1 — title area: back link, dataset info, and freshness
                timestamps (surfaced up top as decision-relevant provenance).
                Fixed at top, never scrolls. */}
            <div className="shrink-0">
              <Link
                href={`/area/${dataset.area.id}`}
                aria-label={t("backToAreaLabel", { area: areaName })}
                className="inline-flex items-center gap-1 mb-4 text-xs text-gray-500 hover:text-gray-800 hover:underline transition-colors"
              >
                <ArrowLeft className="size-3.5 flex-shrink-0" aria-hidden />
                {areaName}
              </Link>
              <DatasetInfoPanel dataset={dataset} />
              <div className="mt-2">
                <DatasetTimestamps dataset={dataset} lastChecked={lastChecked} />
              </div>
            </div>

            {/* Section 2 — tiered stats: the only scrollable region. Framed by top
                and bottom rules so the scroll boundary is clear. */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col border-y border-gray-200 my-4 py-4">
              <DatasetPanelStats dataset={dataset} />
            </div>

            {/* Section 3 — action buttons: fixed height at the bottom. */}
            <DatasetActionsSection
              dataset={dataset}
              savedCount={savedCount}
              saveLimit={saveLimit}
              onRefreshed={setLastChecked}
            />
          </div>
        )}
      </aside>

      {/* Map Panel */}
      <div className="lg:flex-1 lg:h-full h-[60vh]">
        <DatasetMapWrapper
          ref={mapRef}
          dataset={dataset}
          boundary={boundary}
          onFeatureSelect={setSelectedFeature}
        />
      </div>
    </div>
  );
}
