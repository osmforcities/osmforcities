"use client";

import { useRef } from "react";
import Map, { Source, Layer, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection, Feature } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";
import { calculateBbox } from "@/lib/utils";

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

export default function DatasetMap({ dataset }: DatasetMapProps) {
  const mapRef = useRef<MapRef | null>(null);

  if (!dataset.geojson) {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          No data available. Data will be automatically refreshed when you visit
          this page.
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
          No geographic data found in the dataset results.
        </p>
      </div>
    );
  }

  const dataBounds = calculateBbox(geoJSONData);

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
        >
          <AttributionControl position="bottom-right" />

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
        </Map>
      </div>
    </div>
  );
}
