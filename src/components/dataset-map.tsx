"use client";

import { useRef } from "react";
import Map, { Source, Layer, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection, Feature } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";

type DatasetMapProps = {
  dataset: Dataset;
};

export default function DatasetMap({ dataset }: DatasetMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const bbox = dataset.bbox;

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

  return (
    <div className="space-y-4">
      <div
        className="border rounded-lg overflow-hidden"
        style={{ height: 500 }}
      >
        <Map
          ref={mapRef}
          mapStyle="https://tiles.openfreemap.org/styles/positron"
          initialViewState={
            bbox && bbox.length === 4
              ? {
                  bounds: [bbox[0], bbox[1], bbox[2], bbox[3]],
                  fitBoundsOptions: { padding: 20 },
                }
              : dataset.area.bounds
              ? {
                  bounds: (() => {
                    const bounds = dataset.area.bounds.split(",").map(Number);
                    return [
                      bounds[1], // minLon
                      bounds[0], // minLat
                      bounds[3], // maxLon
                      bounds[2], // maxLat
                    ];
                  })(),
                  fitBoundsOptions: { padding: 20 },
                }
              : undefined
          }
        >
          <AttributionControl position="bottom-right" />

          {/* Area boundary */}
          {dataset.area.geojson && (
            <Source
              id="area-boundary"
              type="geojson"
              data={dataset.area.geojson}
            >
              <Layer
                id="area-boundary-layer"
                type="line"
                paint={{
                  "line-color": "#007cbf",
                  "line-width": 3,
                  "line-opacity": 0.8,
                }}
              />
            </Source>
          )}

          {/* Dataset data - separated by geometry type */}
          {geoJSONData && (
            <>
              {/* Polygons and MultiPolygons */}
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
                  paint={{
                    "fill-color": "#ff6b35",
                    "fill-opacity": 0.3,
                    "fill-outline-color": "#ff6b35",
                  }}
                />
              </Source>

              {/* Lines */}
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
                <Layer
                  id="data-lines"
                  type="line"
                  paint={{
                    "line-color": "#ff6b35",
                    "line-width": 3,
                    "line-opacity": 0.8,
                  }}
                />
              </Source>

              {/* Points - only standalone points */}
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
                <Layer
                  id="data-points"
                  type="circle"
                  paint={{
                    "circle-radius": 6,
                    "circle-color": "#ff6b35",
                    "circle-opacity": 0.8,
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#ffffff",
                  }}
                />
              </Source>
            </>
          )}
        </Map>
      </div>
    </div>
  );
}
