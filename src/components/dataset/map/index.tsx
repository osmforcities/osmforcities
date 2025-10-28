"use client";

import { useRef } from "react";
import Map, { Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";
import { calculateBbox } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { DateFilterControls } from "./date-filter-controls";
import { FeatureTooltip } from "./feature-tooltip";
import { MapLayers } from "./layers";
import { NoDataMessage } from "./no-data-message";
import { AgeLegend } from "./age-legend";
import { processOSMFeaturesForVisualization } from "../../../lib/osm-data-processor";
import { useMapInteractions, useDateFilter } from "./hooks";

type DatasetMapProps = {
  dataset: Dataset;
};

export default function DatasetMap({ dataset }: DatasetMapProps) {
  const t = useTranslations("DatasetMap");
  const mapRef = useRef<MapRef | null>(null);

  const { tooltipInfo, handleHover, handleMouseLeave } = useMapInteractions();
  const { dateFilter, setDateFilter, updateFilterIfNeeded } = useDateFilter();

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

  const dataBounds = calculateBbox(geoJSONData);

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
              initialViewState={
                dataBounds
                  ? {
                      bounds: [
                        dataBounds[0],
                        dataBounds[1],
                        dataBounds[2],
                        dataBounds[3],
                      ],
                      fitBoundsOptions: { padding: 20 },
                    }
                  : undefined
              }
              interactiveLayerIds={[
                "simplified-features",
                "detailed-polygons",
                "detailed-lines",
                "detailed-points",
              ]}
              onMouseMove={handleHover}
              onMouseLeave={handleMouseLeave}
            >
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
