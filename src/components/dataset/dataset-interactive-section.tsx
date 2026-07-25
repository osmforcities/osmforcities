"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { Feature, FeatureCollection } from "geojson";
import type { Dataset } from "@/schemas/dataset";
import { Link } from "@/i18n/navigation";
import { DatasetMapWrapper, type DatasetFullMapHandle } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/dataset-stats-table";
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
          <>
            {/* Return to the area's dataset list */}
            <Link
              href={`/area/${dataset.area.id}`}
              className="inline-flex items-center gap-1 mb-4 text-xs text-gray-500 hover:text-gray-800 hover:underline transition-colors"
            >
              <ArrowLeft className="size-3.5 flex-shrink-0" aria-hidden />
              {t("allDatasetsInArea")}
            </Link>
            <div className="flex-1 overflow-y-auto space-y-6" data-testid="dataset-sidebar-default">
              <DatasetInfoPanel dataset={dataset} />
              <DatasetStatsTable dataset={dataset} lastChecked={lastChecked} />
            </div>
            <DatasetActionsSection
              dataset={dataset}
              savedCount={savedCount}
              saveLimit={saveLimit}
              onRefreshed={setLastChecked}
            />
          </>
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
