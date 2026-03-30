"use client";

import React, { useRef, useCallback, useEffect } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import { MapLayers } from "./map/layers";
import { AgeLegend } from "./map/age-legend";
import { MapDateFilterControl } from "./map/map-date-filter-control";
import { useDateFilter, useMapData, useFeatureSelection } from "./map/hooks";
import type { Feature } from "geojson";
import { MapErrorState, MapNoDataState } from "./map/map-states";
import type { DateFilter } from "@/types/geojson";

type DatasetFullMapProps = {
  dataset: Dataset;
  onFeatureSelect?: (feature: Feature | null) => void;
};

// Only memoize heavy components that actually benefit from it
const MemoizedMapLayers = React.memo(MapLayers);
const MemoizedMapDateFilterControl = React.memo(MapDateFilterControl);

export function DatasetFullMap({ dataset, onFeatureSelect }: DatasetFullMapProps) {
  const t = useTranslations("DatasetMap");
  const mapRef = useRef<MapRef | null>(null);

  const { dateFilter, setDateFilter, updateFilterIfNeeded } = useDateFilter();
  const { selectedFeature, handleFeatureClick, handleMouseEnter, handleMouseLeave, cursor } = useFeatureSelection(onFeatureSelect);
  const { processedData, initialViewState, hasFilteredData } = useMapData({
    dataset,
    dateFilter,
  });

  // Update filter if needed
  useEffect(() => {
    if (processedData?.availableTimeframes) {
      updateFilterIfNeeded(processedData.availableTimeframes);
    }
  }, [processedData?.availableTimeframes, updateFilterIfNeeded]);

  // Handle date filter change
  const handleDateFilterChange = useCallback(
    (newFilter: DateFilter) => {
      setDateFilter(newFilter);
    },
    [setDateFilter]
  );

  // Early return for no data
  if (!dataset.geojson) {
    return <MapNoDataState dateFilter={dateFilter} hasData={false} />;
  }

  // Error state
  if (!processedData) {
    return <MapErrorState dateFilter={dateFilter} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 relative">
        {hasFilteredData && (
          /* Legend */
          <div className="absolute z-10 top-4 right-4">
            <AgeLegend />
          </div>
        )}

        {hasFilteredData ? (
          <Map
            ref={mapRef}
            mapStyle="https://tiles.openfreemap.org/styles/positron"
            aria-label={t('fullScreenMapLabel')}
            initialViewState={initialViewState}
            style={{ width: "100%", height: "100%" }}
            cursor={cursor}
            onClick={handleFeatureClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            interactiveLayerIds={[
              "simplified-features",
              "detailed-polygons",
              "detailed-lines",
              "detailed-points",
            ]}
            scrollZoom={true}
            dragPan={true}
            dragRotate={false}
            keyboard={true}
            doubleClickZoom={true}
            touchZoomRotate={true}
          >
            <MemoizedMapLayers geoJSONData={processedData} />
            {selectedFeature && (
              <Source
                id="highlight-feature"
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: selectedFeature.geometry,
                  properties: selectedFeature.properties,
                }}
              >
                <Layer
                  id="highlight-fill"
                  type="fill"
                  paint={{
                    "fill-color": "#0b4ad8",
                    "fill-opacity": 0.3,
                  }}
                />
                <Layer
                  id="highlight-stroke"
                  type="line"
                  paint={{
                    "line-color": "#0b4ad8",
                    "line-width": 3,
                    "line-opacity": 1,
                  }}
                />
                <Layer
                  id="highlight-point"
                  type="circle"
                  paint={{
                    "circle-radius": 6,
                    "circle-color": "#0b4ad8",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#06256d",
                  }}
                />
              </Source>
            )}
            <MemoizedMapDateFilterControl
              availableTimeframes={processedData.availableTimeframes}
              dateFilter={dateFilter}
              onDateFilterChange={handleDateFilterChange}
            />
          </Map>
        ) : (
          <MapNoDataState dateFilter={dateFilter} hasData={hasFilteredData} />
        )}
      </div>
    </div>
  );
}
