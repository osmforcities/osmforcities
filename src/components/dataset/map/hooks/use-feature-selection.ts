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
        const feature = resolveProxyFeature(hit, sourceFeatures);
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
