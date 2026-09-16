import { useState, useCallback } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Feature } from "geojson";
import { resolveProxyFeature } from "../layers/polygon-proxy-points";

export function useFeatureSelection(
  onFeatureSelect?: (feature: Feature | null) => void,
  sourceFeatures: Feature[] = []
) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [cursor, setCursor] = useState<string>("grab");

  const handleFeatureClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const hit = event.features?.[0];
      if (hit) {
        let feature = resolveProxyFeature(hit, sourceFeatures);
        // Vector tiles carry the OSM id as "@id" (raw-tag convention), while
        // the geojson path and the detail panel use "id" — normalize the hit
        // so the panel's OSM link works on both sources.
        const props = feature.properties;
        if (props && !props.id && props["@id"]) {
          feature = { ...feature, properties: { ...props, id: props["@id"] } };
        }
        setSelectedFeature(feature);
        onFeatureSelect?.(feature);
      } else {
        setSelectedFeature(null);
        onFeatureSelect?.(null);
      }
    },
    [onFeatureSelect, sourceFeatures]
  );

  const handleMouseEnter = useCallback(() => setCursor("pointer"), []);
  const handleMouseLeave = useCallback(() => setCursor("grab"), []);

  const handleDeselect = useCallback(() => {
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
