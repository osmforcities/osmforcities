"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRef, useEffect } from "react";

// react component
const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // stops map from initializing more than once and ensures mapContainer is not null

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json", // style URL
      center: [0, 0],
      zoom: 0,
    });
  });

  return <div id="map" ref={mapContainer} className="w-full"></div>;
};

export default Map;
