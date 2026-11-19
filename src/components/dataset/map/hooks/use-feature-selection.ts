import { useState, useCallback, useRef } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { MapGeoJSONFeature } from "maplibre-gl";
import type { Feature } from "geojson";
import { resolveProxyFeature } from "../layers/polygon-proxy-points";
import { hasPartialTags } from "@/lib/dataset-tiles";
import { openedArchive } from "@/lib/pmtiles-protocol";
import { withFullTags } from "@/lib/tiles-full-tags";

export function toSelectedFeature(
  hit: MapGeoJSONFeature,
  sourceFeatures: Feature[]
): Feature {
  const feature = resolveProxyFeature(hit, sourceFeatures);
  // Vector tiles carry the OSM id as "@id" (raw-tag convention), while
  // the geojson path and the detail panel use "id" — normalize the hit
  // so the panel's OSM link works on both sources. No spread: a tile hit's
  // geometry is a prototype getter, so a spread copy loses it (no highlight).
  const props = feature.properties;
  if (props && !props.id && props["@id"]) {
    return {
      type: "Feature",
      geometry: feature.geometry,
      properties: { ...props, id: props["@id"] },
    };
  }
  return feature;
}

/** "loading" while the z14 tile is read, "drawn" when that read found nothing. */
export type TagSet = "all" | "loading" | "drawn";

export type FeatureSelectHandler = (
  feature: Feature | null,
  tagSet?: TagSet
) => void;

export function useFeatureSelection(
  onFeatureSelect?: FeatureSelectHandler,
  sourceFeatures: Feature[] = []
) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [cursor, setCursor] = useState<string>("grab");
  const latestClick = useRef(0);

  const handleFeatureClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const click = ++latestClick.current;
      const hit = event.features?.[0];
      if (!hit) {
        setSelectedFeature(null);
        onFeatureSelect?.(null);
        return;
      }
      const feature = toSelectedFeature(hit, sourceFeatures);
      setSelectedFeature(feature);
      const map = event.target;
      const source = map.getSource(hit.source);
      if (!hasPartialTags(map.getZoom(), source)) {
        onFeatureSelect?.(feature, "all");
        return;
      }
      onFeatureSelect?.(feature, "loading");
      const archive = openedArchive(
        source && "url" in source ? (source.url as string) : undefined
      );
      const full = await withFullTags(feature, archive, event.lngLat);
      if (click !== latestClick.current) return;
      onFeatureSelect?.(full ?? feature, full ? "all" : "drawn");
    },
    [onFeatureSelect, sourceFeatures]
  );

  const handleMouseEnter = useCallback(() => setCursor("pointer"), []);
  const handleMouseLeave = useCallback(() => setCursor("grab"), []);

  const handleDeselect = useCallback(() => {
    latestClick.current++;
    setSelectedFeature(null);
    onFeatureSelect?.(null);
  }, [onFeatureSelect]);

  return {
    selectedFeature,
    handleFeatureClick,
    handleMouseEnter,
    handleMouseLeave,
    handleDeselect,
    cursor,
  };
}
