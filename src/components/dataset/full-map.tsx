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

// Memoized components to prevent unnecessary re-renders
const MemoizedMapLayers = React.memo(MapLayers);
const MemoizedMapDateFilterControl = React.memo(MapDateFilterControl);
const MemoizedAgeLegend = React.memo(AgeLegend);
const MemoizedMapErrorState = React.memo(MapErrorState);
const MemoizedMapNoDataState = React.memo(MapNoDataState);

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
    return <MemoizedMapNoDataState dateFilter={dateFilter} hasData={false} />;
  }

  // Error state
  if (!processedData) {
    return <MemoizedMapErrorState dateFilter={dateFilter} />;
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - var(--nav-height))" }}
    >
      {/* Legend */}
      <div
        className="absolute z-10"
        style={{ top: "calc(var(--nav-height) + 1rem)", right: "1rem" }}
      >
        <MemoizedAgeLegend />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
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
          <MemoizedMapNoDataState
            dateFilter={dateFilter}
            hasData={hasFilteredData}
          />
        )}
      </div>
    </div>
  );
}
