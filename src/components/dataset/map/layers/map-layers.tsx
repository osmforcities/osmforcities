import { useMemo } from "react";
import type { Feature } from "geojson";
import { DetailedFeaturesLayerGroup } from ".";
import type { CategoricalTheme } from "@/lib/map-themes";

export const AGE_COLORS = {
  recent: "#22c55e",
  medium: "#f97316",
  older: "#eab308",
  "very-old": "#9ca3af",
};

export const AGE_STROKE_COLORS = {
  recent: "#16a34a",
  medium: "#ea580c",
  older: "#ca8a04",
  "very-old": "#6b7280",
};

export const POLYGON_STYLE = {
  fill: {
    "fill-color": [
      "case",
      ["==", ["get", "ageCategory"], "recent"],
      AGE_COLORS.recent,
      ["==", ["get", "ageCategory"], "medium"],
      AGE_COLORS.medium,
      ["==", ["get", "ageCategory"], "older"],
      AGE_COLORS.older,
      AGE_COLORS["very-old"],
    ],
    "fill-opacity": 0.7,
  },
  stroke: {
    "line-color": [
      "case",
      ["==", ["get", "ageCategory"], "recent"],
      AGE_STROKE_COLORS.recent,
      ["==", ["get", "ageCategory"], "medium"],
      AGE_STROKE_COLORS.medium,
      ["==", ["get", "ageCategory"], "older"],
      AGE_STROKE_COLORS.older,
      AGE_STROKE_COLORS["very-old"],
    ],
    // Wider stroke at low zoom keeps small polygons visible once their
    // fill shrinks below a pixel
    "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 13, 1.5, 18, 2],
    "line-opacity": 0.9,
  },
};

export const LINE_STYLE = {
  "line-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"],
    AGE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"],
    AGE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"],
    AGE_COLORS.older,
    AGE_COLORS["very-old"],
  ],
  // Wider lines at low zoom so short segments stay readable
  "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 13, 2, 18, 2.5],
  "line-opacity": 0.9,
};

// Low-zoom radius scales with density: sparse points need bulk to stay
// visible on city-wide views, dense ones would blend into a blob
export function buildPointRadiusForCount(count: number) {
  const lowZoomRadius = count > 5000 ? 2 : count > 1500 ? 3 : 3.5;
  return ["interpolate", ["linear"], ["zoom"], 8, lowZoomRadius, 14, 2];
}

export const POINT_STYLE = {
  "circle-radius": 2,
  "circle-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"],
    AGE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"],
    AGE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"],
    AGE_COLORS.older,
    AGE_COLORS["very-old"],
  ],
  "circle-opacity": 0.9,
  "circle-stroke-width": 1,
  "circle-stroke-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"],
    AGE_STROKE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"],
    AGE_STROKE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"],
    AGE_STROKE_COLORS.older,
    AGE_STROKE_COLORS["very-old"],
  ],
};

type MapLayersProps = {
  geoJSONData: {
    features: Feature[];
  };
  categoricalTheme: CategoricalTheme | null;
};

export function MapLayers({ geoJSONData, categoricalTheme }: MapLayersProps) {
  // Stable array identities so downstream geometry work (proxy centroids)
  // only recomputes when the data actually changes
  const { polygonFeatures, lineFeatures, pointFeatures } = useMemo(
    () => ({
      polygonFeatures: geoJSONData.features.filter(
        (f: Feature) =>
          f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
      ),
      lineFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "LineString"
      ),
      pointFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "Point"
      ),
    }),
    [geoJSONData.features]
  );

  return (
    <DetailedFeaturesLayerGroup
      polygonFeatures={polygonFeatures}
      lineFeatures={lineFeatures}
      pointFeatures={pointFeatures}
      categoricalTheme={categoricalTheme}
    />
  );
}
