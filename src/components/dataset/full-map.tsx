"use client";

import React, {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useState,
} from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import { MapLayers } from "./map/layers";
import { AoiBoundaryLayer } from "./map/aoi-boundary-layer";
import {
  InteractiveLegend,
  type LegendCategory,
  type LegendViewOption,
} from "./map/interactive-legend";
import { StyleTuningPanel } from "./map/style-tuning-panel";
import { useMapData, useFeatureSelection } from "./map/hooks";
import type { Feature, FeatureCollection } from "geojson";
import { MapErrorState, MapNoDataState } from "./map/map-states";
import { mapStyle } from "@/lib/map-tiles";
import { AGE_COLORS } from "./map/layers/map-style";
import { PALETTES } from "@/lib/map-palettes";
import {
  buildCuratedThemesFromDimensions,
  buildAgeVisibilityFilter,
  buildTagVisibilityFilter,
  OTHER_CATEGORY,
  MISSING_CATEGORY,
} from "@/lib/curated-themes";
import { computeFilterDimensions } from "@/lib/filter-dimensions";

export interface DatasetFullMapHandle {
  deselectFeature: () => void;
}

type DatasetFullMapProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
  onFeatureSelect?: (feature: Feature | null) => void;
};

const AGE_VIEW_ID = "age";

const AGE_LABEL_KEYS = {
  recent: "recentChanges",
  medium: "mediumChanges",
  older: "olderChanges",
  "very-old": "veryOldChanges",
} as const;

// Only memoize heavy components that actually benefit from it
const MemoizedMapLayers = React.memo(MapLayers);

export const DatasetFullMap = forwardRef<
  DatasetFullMapHandle,
  DatasetFullMapProps
>(({ dataset, boundary, onFeatureSelect }, ref) => {
  const t = useTranslations("DatasetMap");
  const mapRef = useRef<MapRef | null>(null);

  const {
    selectedFeature,
    handleFeatureClick,
    handleMouseEnter,
    handleMouseLeave,
    handleDeselect,
    cursor,
  } = useFeatureSelection(onFeatureSelect);

  // Expose deselect function to parent
  useImperativeHandle(
    ref,
    () => ({
      deselectFeature: handleDeselect,
    }),
    [handleDeselect]
  );

  const { processedData, initialViewState, hasFilteredData } = useMapData({
    dataset,
  });

  const features = processedData?.features;

  // One pass over the features feeds both the curated tag themes and the
  // age bucket counts for the legend rows
  const filterDimensions = useMemo(
    () => (features?.length ? computeFilterDimensions(features) : []),
    [features]
  );

  // Curated tag themes from the allow-list (#184) — no auto-detection
  const curatedThemes = useMemo(
    () => buildCuratedThemesFromDimensions(filterDimensions),
    [filterDimensions]
  );

  const ageDimension = useMemo(
    () => filterDimensions.find((d) => d.kind === "age"),
    [filterDimensions]
  );

  // Legend state: which view colors the map, which categories are hidden
  const [activeViewId, setActiveViewId] = useState(AGE_VIEW_ID);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const activeTheme = useMemo(
    () => curatedThemes.find((theme) => theme.field === activeViewId) ?? null,
    [curatedThemes, activeViewId]
  );

  // A stale view id (data changed underneath) resets to the age view so the
  // hidden set cannot carry ids from the vanished view
  useEffect(() => {
    if (!activeTheme && activeViewId !== AGE_VIEW_ID) {
      setActiveViewId(AGE_VIEW_ID);
      setHiddenIds(new Set());
    }
  }, [activeTheme, activeViewId]);

  const views: LegendViewOption[] = useMemo(
    () => [
      { id: AGE_VIEW_ID, label: t("lastEditedLegend") },
      ...curatedThemes.map((theme) => ({ id: theme.field, label: theme.field })),
    ],
    [curatedThemes, t]
  );

  const categories: LegendCategory[] = useMemo(() => {
    if (!activeTheme) {
      return (ageDimension?.values ?? []).map(({ value, count }) => ({
        id: value,
        label: t(AGE_LABEL_KEYS[value as keyof typeof AGE_LABEL_KEYS]),
        color: AGE_COLORS[value as keyof typeof AGE_COLORS],
        count,
      }));
    }
    const rows: LegendCategory[] = activeTheme.topValues.map(
      ({ value, count }) => ({
        id: value.toLowerCase(),
        label: value,
        color: activeTheme.colorMap.get(value.toLowerCase())!,
        count,
      })
    );
    if (activeTheme.otherCount > 0) {
      rows.push({
        id: OTHER_CATEGORY,
        label: t("legendOther"),
        color: PALETTES.categorical.other,
        count: activeTheme.otherCount,
      });
    }
    if (activeTheme.missingCount > 0) {
      rows.push({
        id: MISSING_CATEGORY,
        label: t("legendMissing"),
        color: PALETTES.categorical.missing,
        count: activeTheme.missingCount,
        muted: true,
      });
    }
    return rows;
  }, [activeTheme, ageDimension, t]);

  const visibilityFilter = useMemo(
    () =>
      activeTheme
        ? buildTagVisibilityFilter(activeTheme, hiddenIds)
        : buildAgeVisibilityFilter(hiddenIds),
    [activeTheme, hiddenIds]
  );

  const handleViewChange = useCallback((viewId: string) => {
    setActiveViewId(viewId);
    setHiddenIds(new Set());
  }, []);

  const handleToggle = useCallback((categoryId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  // Early return for no data
  if (!dataset.geojson) {
    return <MapNoDataState hasData={false} />;
  }

  // Error state
  if (!processedData) {
    return <MapErrorState />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 relative">
        {hasFilteredData && (
          /* Legend: the map's single control (#184) */
          <div className="absolute z-10 top-4 end-4">
            <InteractiveLegend
              views={views}
              activeViewId={activeTheme ? activeTheme.field : AGE_VIEW_ID}
              categories={categories}
              hiddenIds={hiddenIds}
              onViewChange={handleViewChange}
              onToggle={handleToggle}
            />
          </div>
        )}

        {hasFilteredData ? (
          <Map
            ref={mapRef}
            mapStyle={mapStyle}
            aria-label={t("fullScreenMapLabel")}
            initialViewState={initialViewState}
            style={{ width: "100%", height: "100%" }}
            cursor={cursor}
            onClick={handleFeatureClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            interactiveLayerIds={[
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
            <MemoizedMapLayers
              geoJSONData={processedData}
              curatedTheme={activeTheme}
              visibilityFilter={visibilityFilter}
            />
            {/* Panel writes age paint to the shared layers; keep it out of
                curated-theme views so it cannot stomp their colors */}
            {!activeTheme && <StyleTuningPanel features={processedData.features} />}
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
                  filter={["==", "$type", "Polygon"]}
                  paint={{
                    "fill-color": "#0b4ad8",
                    "fill-opacity": 0.3,
                  }}
                />
                <Layer
                  id="highlight-stroke"
                  type="line"
                  filter={["!=", "$type", "Point"]}
                  paint={{
                    "line-color": "#0b4ad8",
                    "line-width": 3,
                    "line-opacity": 1,
                  }}
                />
                {/* Point filter: without it a selected polygon/line gets a
                    circle drawn on every vertex */}
                <Layer
                  id="highlight-point"
                  type="circle"
                  filter={["==", "$type", "Point"]}
                  paint={{
                    "circle-radius": 6,
                    "circle-color": "#0b4ad8",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#06256d",
                  }}
                />
              </Source>
            )}
          </Map>
        ) : (
          <MapNoDataState hasData={hasFilteredData} />
        )}
      </div>
    </div>
  );
});

DatasetFullMap.displayName = "DatasetFullMap";
