"use client";

import React, { useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useMemo, useState } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import { MapLayers } from "./map/layers";
import { AoiBoundaryLayer } from "./map/aoi-boundary-layer";
import { AgeLegend } from "./map/age-legend";
import { MapLegend } from "./map/map-legend";
import { MapDateFilterControl } from "./map/map-date-filter-control";
import { useDateFilter, useMapData, useFeatureSelection } from "./map/hooks";
import type { Feature, FeatureCollection } from "geojson";
import { MapErrorState, MapNoDataState } from "./map/map-states";
import type { DateFilter } from "@/types/geojson";
import { mapStyle } from "@/lib/map-tiles";
import { detectMapThemes } from "@/lib/map-themes";
import type { CategoricalTheme } from "@/lib/map-themes";

export interface DatasetFullMapHandle {
  deselectFeature: () => void;
}

type DatasetFullMapProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
  onFeatureSelect?: (feature: Feature | null) => void;
};

// Only memoize heavy components that actually benefit from it
const MemoizedMapLayers = React.memo(MapLayers);
const MemoizedMapDateFilterControl = React.memo(MapDateFilterControl);

export const DatasetFullMap = forwardRef<DatasetFullMapHandle, DatasetFullMapProps>(
  ({ dataset, boundary, onFeatureSelect }, ref) => {
    const t = useTranslations("DatasetMap");
    const mapRef = useRef<MapRef | null>(null);

    const { dateFilter, setDateFilter, updateFilterIfNeeded } = useDateFilter();
    const { selectedFeature, handleFeatureClick, handleMouseEnter, handleMouseLeave, handleDeselect, cursor } = useFeatureSelection(onFeatureSelect);

    // Expose deselect function to parent
    useImperativeHandle(ref, () => ({
      deselectFeature: handleDeselect,
    }), [handleDeselect]);
  const { processedData, initialViewState, hasFilteredData } = useMapData({
    dataset,
    dateFilter,
  });

  // Detect categorical themes from dataset features
  const categoricalThemes = useMemo(() => {
    if (!processedData?.features || processedData.features.length === 0) {
      return [];
    }
    const allThemes = detectMapThemes(processedData.features);
    return allThemes.filter((t) => t.type === 'categorical');
  }, [processedData?.features]);

  // Theme selection - null means age theme, non-null means categorical theme
  const [selectedCategoricalTheme, setSelectedCategoricalTheme] = useState<CategoricalTheme | null>(null);
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
          /* Theme Selector */
          <div className="absolute z-10 top-4 left-4">
            {categoricalThemes.length > 0 && (
              <select
                value={selectedCategoricalTheme ? selectedCategoricalTheme.field : 'age'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'age') {
                    setSelectedCategoricalTheme(null);
                  } else {
                    const theme = categoricalThemes.find(t => t.field === value);
                    if (theme) {
                      setSelectedCategoricalTheme(theme);
                    }
                  }
                }}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              >
                <option value="age">{t('age')}</option>
                {categoricalThemes.map(theme => (
                  <option key={theme.field} value={theme.field}>
                    {theme.field}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {hasFilteredData && (
          /* Legend */
          <div className="absolute z-10 top-4 right-4">
            {selectedCategoricalTheme ? (
              <MapLegend theme={selectedCategoricalTheme} title={selectedCategoricalTheme.field} />
            ) : (
              <AgeLegend />
            )}
          </div>
        )}

        {hasFilteredData ? (
          <Map
            ref={mapRef}
            mapStyle={mapStyle}
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
            {boundary && <AoiBoundaryLayer boundary={boundary} />}
            <MemoizedMapLayers geoJSONData={processedData} categoricalTheme={selectedCategoricalTheme} />
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
            {!selectedCategoricalTheme && (
              <MemoizedMapDateFilterControl
                availableTimeframes={processedData.availableTimeframes}
                dateFilter={dateFilter}
                onDateFilterChange={handleDateFilterChange}
              />
            )}
          </Map>
        ) : (
          <MapNoDataState dateFilter={dateFilter} hasData={hasFilteredData} />
        )}
      </div>
    </div>
  );
});

DatasetFullMap.displayName = "DatasetFullMap";
