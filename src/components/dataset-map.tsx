"use client";

import { useRef, useState, useCallback } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection, Feature } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";
import { calculateBbox } from "@/lib/utils";
import { useTranslations } from "next-intl";

const FEATURE_FILL_COLOR = "#ff6b35";
const FEATURE_BORDER_COLOR = "#ff6b35";

const POLYGON_STYLE = {
  fill: {
    "fill-color": FEATURE_FILL_COLOR,
    "fill-opacity": 0.7,
  },
  stroke: {
    "line-color": FEATURE_BORDER_COLOR,
    "line-width": 4,
    "line-opacity": 0.9,
  },
};

const LINE_STYLE = {
  "line-color": FEATURE_FILL_COLOR,
  "line-width": 3,
  "line-opacity": 0.9,
};

const POINT_STYLE = {
  "circle-radius": 1,
  "circle-color": FEATURE_FILL_COLOR,
  "circle-opacity": 0.9,
  "circle-stroke-width": 1,
  "circle-stroke-color": FEATURE_BORDER_COLOR,
};

type DatasetMapProps = {
  dataset: Dataset;
};

type TooltipInfo = {
  latitude: number;
  longitude: number;
  feature: Feature;
};

export default function DatasetMap({ dataset }: DatasetMapProps) {
  const t = useTranslations("DatasetMap");
  const mapRef = useRef<MapRef | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null);

  const onHover = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      setTooltipInfo({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        feature,
      });
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setTooltipInfo(null);
  }, []);

  if (!dataset.geojson) {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          {t("noDataAvailable")}
        </p>
      </div>
    );
  }

  const geoJSONData = GeoJSONFeatureCollectionSchema.parse(
    dataset.geojson
  ) as FeatureCollection;

  if (geoJSONData.features.length === 0) {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          {t("noGeographicData")}
        </p>
      </div>
    );
  }

  const dataBounds = calculateBbox(geoJSONData);

  const renderTooltipContent = (feature: Feature) => {
    const properties = feature.properties || {};

    // Separate OSM tags from metadata
    const tags: Record<string, string> = {};
    const meta: Record<string, string> = {};

    Object.entries(properties).forEach(([key, value]) => {
      if (key.startsWith("@")) {
        // OSM metadata starts with @
        meta[key.slice(1)] = String(value);
      } else {
        // Regular OSM tags
        tags[key] = String(value);
      }
    });

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border max-w-sm">
        {Object.keys(tags).length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {t("tags")}
            </h4>
            <div className="space-y-1">
              {Object.entries(tags).map(([key, value]) => (
                <div key={key} className="flex text-xs">
                  <span className="font-medium text-gray-600 dark:text-gray-300 mr-2 min-w-0 truncate">
                    {key}{t("colon")}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 break-all">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(meta).length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {t("meta")}
            </h4>
            <div className="space-y-1">
              {Object.entries(meta).map(([key, value]) => (
                <div key={key} className="flex text-xs">
                  <span className="font-medium text-gray-600 dark:text-gray-300 mr-2 min-w-0 truncate">
                    {key}{t("colon")}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 break-all">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(tags).length === 0 && Object.keys(meta).length === 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("noAdditionalInfo")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div
        className="border rounded-lg overflow-hidden"
        style={{ height: 500 }}
      >
        <Map
          ref={mapRef}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
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
          interactiveLayerIds={["data-polygons", "data-lines", "data-points"]}
          onMouseMove={onHover}
          onMouseLeave={onMouseLeave}
        >
          {geoJSONData && (
            <>
              <Source
                id="dataset-polygons"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: geoJSONData.features.filter(
                    (f: Feature) =>
                      f.geometry.type === "Polygon" ||
                      f.geometry.type === "MultiPolygon"
                  ),
                }}
              >
                <Layer
                  id="data-polygons"
                  type="fill"
                  paint={POLYGON_STYLE.fill}
                />
                <Layer
                  id="data-polygons-stroke"
                  type="line"
                  paint={POLYGON_STYLE.stroke}
                />
              </Source>

              <Source
                id="dataset-lines"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: geoJSONData.features.filter(
                    (f: Feature) => f.geometry.type === "LineString"
                  ),
                }}
              >
                <Layer id="data-lines" type="line" paint={LINE_STYLE} />
              </Source>

              <Source
                id="dataset-points"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: geoJSONData.features.filter(
                    (f: Feature) => f.geometry.type === "Point"
                  ),
                }}
              >
                <Layer id="data-points" type="circle" paint={POINT_STYLE} />
              </Source>
            </>
          )}

          {tooltipInfo && (
            <Popup
              longitude={tooltipInfo.longitude}
              latitude={tooltipInfo.latitude}
              closeButton={false}
              closeOnClick={false}
              anchor="bottom"
              offset={10}
            >
              {renderTooltipContent(tooltipInfo.feature)}
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
