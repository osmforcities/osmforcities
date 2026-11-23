import { useState, useCallback, useRef } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { MapGeoJSONFeature } from "maplibre-gl";
import type { Feature } from "geojson";
import { hasDrawnTagsOnly } from "@/lib/dataset-tiles";
import { openedArchive } from "@/lib/pmtiles-protocol";
import { withFullTags, type TagSet } from "@/lib/tiles-full-tags";

export function toSelectedFeature(hit: MapGeoJSONFeature): Feature {
  // Vector tiles carry the OSM id as "@id" (raw-tag convention), while the
  // detail panel reads "id". No spread: a tile hit's geometry is a prototype
  // getter, so a spread copy loses it (no highlight).
  const props = hit.properties;
  if (props && !props.id && props["@id"]) {
    return {
      type: "Feature",
      geometry: hit.geometry,
      properties: { ...props, id: props["@id"] },
    };
  }
  return hit;
}

export type FeatureSelectHandler = (
  feature: Feature | null,
  tagSet?: TagSet
) => void;

export async function selectFromTiles(
  feature: Feature,
  readFull: () => Promise<Feature | null>,
  select: FeatureSelectHandler,
  isLatestClick: () => boolean
): Promise<void> {
  select(feature, "loading");
  const full = await readFull();
  if (!isLatestClick()) return;
  select(full ?? feature, full ? "full" : "drawn");
}

export function useFeatureSelection(onFeatureSelect?: FeatureSelectHandler) {
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
      const feature = toSelectedFeature(hit);
      setSelectedFeature(feature);
      const map = event.target;
      const source = map.getSource(hit.source);
      if (!hasDrawnTagsOnly(map.getZoom(), source)) {
        onFeatureSelect?.(feature, "full");
        return;
      }
      await selectFromTiles(
        feature,
        () => withFullTags(feature, openedArchive(source), event.lngLat),
        (selected, tagSet) => onFeatureSelect?.(selected, tagSet),
        () => click === latestClick.current
      );
    },
    [onFeatureSelect]
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
