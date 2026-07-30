"use client";

import { NavigationControl } from "react-map-gl/maplibre";

/**
 * Shared zoom (+/-) control for every platform map. Rendered as a child of a
 * react-map-gl <Map>. Position comes from the control's own `position` prop —
 * react-map-gl mounts it into maplibre's corner container, so wrapping it in a
 * positioned div has no effect. Top-left, no compass/pitch: the one corner free
 * on every map (dataset legend is top-right, featured info card is bottom-right,
 * attribution is bottom-right), so all maps expose zoom consistently.
 */
export function MapZoomControl() {
  return (
    <NavigationControl
      position="top-left"
      showCompass={false}
      visualizePitch={false}
    />
  );
}
