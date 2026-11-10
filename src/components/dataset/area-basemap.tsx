"use client";

import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { useAreaBoundary } from "@/hooks/useAreaBoundary";
import { AoiBoundaryLayer } from "./map/aoi-boundary-layer";
import { MapZoomControl } from "@/components/ui/map-zoom-control";
import { mapStyle } from "@/lib/map-tiles";
import { calculateBbox } from "@/lib/utils";

/**
 * The dataset map before it has any data: the basemap framed on the area,
 * with its outline. It fills the map's place on the screens that have no map
 * to show, so the page keeps the shape it will have once the map lands.
 */
export function AreaBasemap({ areaId }: { areaId: number }) {
  const t = useTranslations("DatasetMap");
  const boundary = useAreaBoundary(areaId);
  const bounds = boundary ? calculateBbox(boundary) : null;

  // Without an outline there is nowhere to frame the map, so the place stays
  // an empty well.
  if (!boundary || !bounds) return <div className="h-full bg-gray-100" />;

  return (
    <Map
      mapStyle={mapStyle}
      aria-label={t("areaBasemapLabel")}
      initialViewState={{ bounds, fitBoundsOptions: { padding: 40 } }}
      style={{ width: "100%", height: "100%" }}
      dragRotate={false}
    >
      <AoiBoundaryLayer boundary={boundary} />
      <MapZoomControl />
    </Map>
  );
}
