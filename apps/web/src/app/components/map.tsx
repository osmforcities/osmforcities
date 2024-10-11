"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRef, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import bbox from "@turf/bbox";

// react component
const Map = ({ geojson }: { geojson: FeatureCollection | null }) => {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // stops map from initializing more than once and ensures mapContainer is not null

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright", // style URL
      zoom: 0,
      center: [0, 0],
    });

    //zoom to geojson bounds
    map.current.on("load", () => {
      if (map.current && geojson) {
        map.current.addSource("geojson", {
          type: "geojson",
          data: geojson,
        });

        map.current.addLayer({
          id: "geojson-fill",
          type: "fill",
          source: "geojson",
          paint: {
            "fill-color": "#888888",
            "fill-opacity": 0.4,
          },
          filter: ["==", "$type", "Polygon"],
        });

        map.current.addLayer({
          id: "geojson-point",
          type: "circle",
          source: "geojson",
          paint: {
            "circle-radius": 6,
            "circle-color": "#B42222",
          },
          filter: ["==", "$type", "Point"],
        });

        const bounds = bbox(geojson);

        map.current.fitBounds(
          new maplibregl.LngLatBounds(
            new maplibregl.LngLat(bounds[0], bounds[1]),
            new maplibregl.LngLat(bounds[2], bounds[3])
          ),
          { padding: 20 }
        );
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
