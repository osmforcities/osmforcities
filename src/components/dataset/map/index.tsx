"use client";

import { useRef, useMemo } from "react";
import Map, { Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";
import { calculateBbox, parseAreaBounds } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { DateFilterControls } from "./date-filter-controls";
import { FeatureTooltip } from "./feature-tooltip";
import { MapLayers } from "./layers";
import { AoiBoundaryLayer } from "./aoi-boundary-layer";
import { NoDataMessage } from "./no-data-message";
import { AgeLegend } from "./age-legend";
import { processOSMFeaturesForVisualization } from "../../../lib/osm-data-processor";
import { useMapInteractions, useDateFilter } from "./hooks";


type DatasetMapProps = {
  dataset: Dataset;
  boundary?: FeatureCollection | null;
};

export default function DatasetMap({ dataset, boundary }: DatasetMapProps) {
  const t = useTranslations("DatasetMap");
  const mapRef = useRef<MapRef | null>(null);

  const { tooltipInfo, handleHover, handleMouseLeave } = useMapInteractions();
  const { dateFilter, setDateFilter, updateFilterIfNeeded } = useDateFilter();

  // Calculate initial view state before any conditional returns
  const initialViewState = useMemo(() => {
    const areaBounds = parseAreaBounds(dataset.area);

    if (areaBounds) {
      return {
        bounds: areaBounds,
        fitBoundsOptions: { padding: 20 },
      };
    }

    if (dataset.geojson) {
      const rawGeoJSONData = GeoJSONFeatureCollectionSchema.parse(
        dataset.geojson
      ) as FeatureCollection;

      const geoJSONData = processOSMFeaturesForVisualization(
        rawGeoJSONData,
        dateFilter
      );

      const dataBounds = calculateBbox(geoJSONData);

      if (dataBounds) {
        return {
          bounds: dataBounds,
          fitBoundsOptions: { padding: 20 },
        };
      }
    }

    return undefined;
  }, [dataset.area, dataset.geojson, dateFilter]);

  if (!dataset.geojson) {
    return (
      <div className="space-y-4">
        <DateFilterControls
          availableTimeframes={[]}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
        <NoDataMessage
          hasData={false}
          dateFilter={dateFilter}
          noDataMessage={t("noDataAvailable")}
        />
      </div>
    );
  }

  const rawGeoJSONData = GeoJSONFeatureCollectionSchema.parse(
    dataset.geojson
  ) as FeatureCollection;

  const geoJSONData = processOSMFeaturesForVisualization(
    rawGeoJSONData,
    dateFilter
  );

  const availableTimeframes = geoJSONData.availableTimeframes;
  updateFilterIfNeeded(availableTimeframes);

  const hasFilteredData = geoJSONData.features.length > 0;

  return (
    <div className="space-y-4">
      <DateFilterControls
        availableTimeframes={availableTimeframes}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />

      <NoDataMessage hasData={hasFilteredData} dateFilter={dateFilter} />

      {hasFilteredData && (
        <div className="relative">
          <div
            className="border rounded-lg overflow-hidden"
            style={{ height: 500 }}
          >
            <Map
              ref={mapRef}
              mapStyle="https://tiles.openfreemap.org/styles/positron"
              aria-label={t('mapLabel')}
              initialViewState={initialViewState}
              interactiveLayerIds={[
                "simplified-features",
                "detailed-polygons",
                "detailed-lines",
                "detailed-points",
              ]}
              onMouseMove={handleHover}
              onMouseLeave={handleMouseLeave}
            >
              {boundary && <AoiBoundaryLayer boundary={boundary} />}
              {geoJSONData && <MapLayers geoJSONData={geoJSONData} />}
              {tooltipInfo && (
                <Popup
                  longitude={tooltipInfo.longitude}
                  latitude={tooltipInfo.latitude}
                  closeButton={false}
                  closeOnClick={false}
                  anchor="bottom"
                  offset={10}
                >
                  <FeatureTooltip feature={tooltipInfo.feature} />
                </Popup>
              )}
            </Map>
          </div>

          {/* Age-based legend positioned over the map */}
          <div className="absolute bottom-4 left-4 z-10">
            <AgeLegend />
          </div>
        </div>
      )}
    </div>
  );
}
