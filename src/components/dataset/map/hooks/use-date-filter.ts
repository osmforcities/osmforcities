import { useState, useCallback } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Feature } from "geojson";
import type { DateFilter } from "../../../../types/geojson";

export function useFeatureSelection(
  onFeatureSelect?: (feature: Feature | null) => void
) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [cursor, setCursor] = useState<string>("grab");

  const handleFeatureClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as Feature | undefined;
      if (feature) {
        setSelectedFeature(feature);
        onFeatureSelect?.(feature);
      } else {
        setSelectedFeature(null);
        onFeatureSelect?.(null);
      }
    },
    [onFeatureSelect]
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

export function useDateFilter() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const updateFilterIfNeeded = useCallback(
    (availableTimeframes: DateFilter[]) => {
      if (!availableTimeframes.includes(dateFilter)) {
        setDateFilter("all");
      }
    },
    [dateFilter]
  );

  return {
    dateFilter,
    setDateFilter,
    updateFilterIfNeeded,
  };
}
