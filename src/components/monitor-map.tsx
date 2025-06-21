"use client";

import { useRef, useCallback, useEffect } from "react";
import Map, { Source, Layer, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FeatureCollection, Feature } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";

type MonitorMapProps = {
  monitor: {
    geojson: FeatureCollection; // Since we use osmtogeojson, this is always valid GeoJSON
    area: {
      bounds: string | null;
      geojson: FeatureCollection | null;
    };
  };
};

export default function MonitorMap({ monitor }: MonitorMapProps) {
  const mapRef = useRef<MapRef | null>(null);

  const updateMapBounds = useCallback(() => {
    if (monitor?.area?.bounds && mapRef.current) {
      const bounds = monitor.area.bounds.split(",").map(Number);
      mapRef.current.fitBounds(
        [
          bounds[1], // minLon
          bounds[0], // minLat
          bounds[3], // maxLon
          bounds[2], // maxLat
        ],
        { padding: 50, animate: false }
      );
    }
  }, [monitor]);

  // Handle map bounds when monitor data loads
  useEffect(() => {
    if (mapRef.current && monitor) {
      updateMapBounds();
    }
  }, [monitor, updateMapBounds]);

  if (!monitor.geojson) {
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
    monitor.geojson
  ) as FeatureCollection;

  if (geoJSONData.features.length === 0) {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          No geographic data found in the monitor results.
        </p>
      </div>
    );
  }

  const featureTypes = geoJSONData.features.reduce(
    (acc: Record<string, number>, feature: Feature) => {
      const type = feature.geometry.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
          Data Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold">{geoJSONData.features.length}</p>
            <p className="text-sm text-muted-foreground">Total Features</p>
          </div>
          {Object.entries(featureTypes).map(([type, count]) => (
            <div key={type}>
              <p className="text-2xl font-bold">{count as number}</p>
              <p className="text-sm text-muted-foreground capitalize">{type}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Interactive map visualization is available below.
        </p>
        <p className="text-sm text-muted-foreground">
          The map shows the geographic data from your monitor results.
        </p>
      </div>

      {monitor.area.bounds && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
            Area Bounds
          </h3>
          <p className="text-sm font-mono">{monitor.area.bounds}</p>
        </div>
      )}

      <div
        className="border rounded-lg overflow-hidden"
        style={{ height: 500 }}
      >
        <Map
          ref={mapRef}
          onLoad={updateMapBounds}
          mapStyle="https://tiles.openfreemap.org/styles/positron"
          initialViewState={
            monitor.area.bounds
              ? {
                  bounds: (() => {
                    const bounds = monitor.area.bounds.split(",").map(Number);
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
          {monitor.area.geojson && (
            <Source
              id="area-boundary"
              type="geojson"
              data={monitor.area.geojson}
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

          {/* Monitor data - separated by geometry type */}
          {geoJSONData && (
            <>
              {/* Polygons and MultiPolygons */}
              <Source
                id="monitor-polygons"
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
                id="monitor-lines"
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
                id="monitor-points"
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
