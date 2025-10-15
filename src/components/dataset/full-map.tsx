"use client";

import React, { useRef, useCallback, useEffect } from "react";
import Map from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Dataset } from "@/schemas/dataset";
import { MapLayers } from "./map/layers";
import { AgeLegend } from "./map/age-legend";
import { MapDateFilterControl } from "./map/map-date-filter-control";
import { useDateFilter, useMapData } from "./map/hooks";
import { MapErrorState, MapNoDataState } from "./map/map-states";
import type { DateFilter } from "@/types/geojson";

type DatasetFullMapProps = {
  dataset: Dataset;
};

// Only memoize heavy components that actually benefit from it
const MemoizedMapLayers = React.memo(MapLayers);
const MemoizedMapDateFilterControl = React.memo(MapDateFilterControl);

export function DatasetFullMap({ dataset }: DatasetFullMapProps) {
  const mapRef = useRef<MapRef | null>(null);

  const { dateFilter, setDateFilter, updateFilterIfNeeded } = useDateFilter();
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
            initialViewState={initialViewState}
            style={{ width: "100%", height: "100%" }}
            scrollZoom={true}
            dragPan={true}
            dragRotate={false}
            keyboard={true}
            doubleClickZoom={true}
            touchZoomRotate={true}
          >
            <MemoizedMapLayers geoJSONData={processedData} />
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
