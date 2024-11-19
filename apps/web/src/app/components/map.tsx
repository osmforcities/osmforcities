"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRef, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import bbox from "@turf/bbox";

const FEATURE_FILL_COLOR = "#FF600B";
const FEATURE_BORDER_COLOR = "#8D341F";

const calculateAge = (timestamp: string) => {
  const featureDate = new Date(timestamp);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - featureDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Age in days
};

const preprocessGeoJSON = (geojson: FeatureCollection) => {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const age = feature.properties?.timestamp
        ? calculateAge(feature.properties.timestamp)
        : 0;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          age,
        },
      };
    }),
  };
};

const Map = ({ geojson }: { geojson: FeatureCollection | null }) => {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current || !geojson) return;

    // Preprocess GeoJSON to add age property
    const processedGeoJSON = preprocessGeoJSON(geojson);

    const bounds = bbox(processedGeoJSON);

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/positron", // Base map style
      bounds: new maplibregl.LngLatBounds(
        new maplibregl.LngLat(bounds[0], bounds[1]),
        new maplibregl.LngLat(bounds[2], bounds[3])
      ),
      fitBoundsOptions: { padding: 20 },
    });

    map.current.on("load", () => {
      if (map.current) {
        // Add GeoJSON source
        map.current.addSource("geojson", {
          type: "geojson",
          data: processedGeoJSON,
        });

        // Add fill layer for polygons
        map.current.addLayer({
          id: "geojson-fill",
          type: "fill",
          source: "geojson",
          paint: {
            "fill-color": FEATURE_FILL_COLOR,
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["get", "age"],
              0,
              1,
              365,
              0.4,
            ],
          },
          filter: ["==", "$type", "Polygon"],
        });

        // Add stroke layer for polygons
        map.current.addLayer({
          id: "geojson-polygon-stroke",
          type: "line",
          source: "geojson",
          paint: {
            "line-color": FEATURE_BORDER_COLOR,
            "line-width": 1.5,
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["get", "age"],
              0,
              1,
              365,
              0.4,
            ],
          },
          filter: ["==", "$type", "Polygon"],
        });

        // Add line layer for LineString
        map.current.addLayer({
          id: "geojson-lines",
          type: "line",
          source: "geojson",
          paint: {
            "line-color": FEATURE_FILL_COLOR,
            "line-width": 2,
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["get", "age"],
              0,
              1,
              365,
              0.4,
            ],
          },
          filter: ["==", "$type", "LineString"],
        });

        // Add circle layer for points
        map.current.addLayer({
          id: "geojson-points",
          type: "circle",
          source: "geojson",
          paint: {
            "circle-radius": 6,
            "circle-color": FEATURE_FILL_COLOR,
            "circle-stroke-width": 1,
            "circle-stroke-color": FEATURE_BORDER_COLOR,
            "circle-opacity": [
              "interpolate",
              ["linear"],
              ["get", "age"],
              0,
              1,
              365,
              0.4,
            ],
          },
          filter: ["==", "$type", "Point"],
        });
      }
    });
  }, [geojson]);

  return (
    <div
      id="map"
      ref={mapContainer}
      className="w-full overflow-hidden"
      style={{ height: "calc(100vh - var(--nav-height))" }}
    ></div>
  );
};

export default Map;
