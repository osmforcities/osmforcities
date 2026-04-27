"use client";

import { useState, useEffect, useRef } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { Dataset } from "@/schemas/dataset";
import { DatasetMapWrapper, type DatasetFullMapHandle } from "@/components/dataset/map-wrapper";
import { DatasetInfoPanel } from "@/components/dataset/dataset-info-panel";
import { DatasetStatsTable } from "@/components/dataset/dataset-stats-table";
import { DatasetActionsSection } from "@/components/dataset/dataset-actions-section";
import { FeatureDetailPanel } from "@/components/dataset/feature-detail-panel";

type DatasetInteractiveSectionProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
};

export function DatasetInteractiveSection({
  dataset,
  boundary,
}: DatasetInteractiveSectionProps) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const mapRef = useRef<DatasetFullMapHandle>(null);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
      {/* Side Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
          <div className="flex flex-col h-full">
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
                <div className="flex-1 overflow-y-auto space-y-6" data-testid="dataset-sidebar-default">
                  <DatasetInfoPanel dataset={dataset} />
                  <DatasetStatsTable dataset={dataset} />
                </div>
                <DatasetActionsSection dataset={dataset} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map Panel */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
          <DatasetMapWrapper
            ref={mapRef}
            dataset={dataset}
            boundary={boundary}
            onFeatureSelect={setSelectedFeature}
          />
        </div>
      </div>
    </div>
  );
}
