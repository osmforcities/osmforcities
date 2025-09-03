import { useState, useCallback } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { DateFilter } from "../../../../types/geojson";
import type { TooltipInfo } from "../../../../types/geojson";

export function useMapInteractions() {
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null);

  const handleHover = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      setTooltipInfo({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        feature,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipInfo(null);
  }, []);

  return {
    tooltipInfo,
    handleHover,
    handleMouseLeave,
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
