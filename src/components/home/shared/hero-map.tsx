"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { HERO_LOCATIONS } from "./hero-map-locations";

// Vector style (MapLibre) backed by OSM tiles
const HERO_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export function HeroMap() {
  const t = useTranslations("Home.hero");
  const location = useMemo(() => {
    const fallback = HERO_LOCATIONS[0];
    if (!fallback) return null;
    const randomIndex = Math.floor(Math.random() * HERO_LOCATIONS.length);
    return HERO_LOCATIONS[randomIndex] ?? fallback;
  }, []);

  return (
    <div className="relative h-full min-h-[320px] bg-gray-100 dark:bg-gray-900">
      <Map
        mapStyle={HERO_MAP_STYLE_URL}
        initialViewState={
          location ?? {
            longitude: 0,
            latitude: 0,
            zoom: 1,
          }
        }
        dragPan
        scrollZoom={false}
        dragRotate={false}
        doubleClickZoom
        touchZoomRotate
        keyboard
        attributionControl={false}
        reuseMaps
        key={location?.id ?? "hero-map"}
        style={{ width: "100%", height: "100%" }}
      >
        <div className="absolute right-3 bottom-3">
          <NavigationControl showCompass={false} visualizePitch={false} />
        </div>
      </Map>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white shadow-sm">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {t("osmAttribution")}
        </a>
      </div>
    </div>
  );
}
