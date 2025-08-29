import type { Feature } from "geojson";
import { SimplifiedFeaturesLayerGroup, DetailedFeaturesLayerGroup } from ".";
import { createSimplifiedFeatures } from "@/lib/geojson";

export const AGE_COLORS = {
  recent: "#22c55e",
  medium: "#f97316",
  older: "#eab308",
  "very-old": "#6b7280",
};

export const AGE_STROKE_COLORS = {
  recent: "#16a34a",
  medium: "#ea580c",
  older: "#ca8a04",
  "very-old": "#4b5563",
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
    "line-width": 1.5,
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
  "line-width": 2,
  "line-opacity": 0.9,
};

export const POINT_STYLE = {
  "circle-radius": 3,
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
};

export function MapLayers({ geoJSONData }: MapLayersProps) {
  const polygonFeatures = geoJSONData.features.filter(
    (f: Feature) =>
      f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
  );

  const lineFeatures = geoJSONData.features.filter(
    (f: Feature) => f.geometry.type === "LineString"
  );

  const pointFeatures = geoJSONData.features.filter(
    (f: Feature) => f.geometry.type === "Point"
  );

  const simplifiedFeatures = createSimplifiedFeatures(
    polygonFeatures,
    lineFeatures,
    pointFeatures
  );

  console.log("Layer counts:", {
    polygons: polygonFeatures.length,
    lines: lineFeatures.length,
    points: pointFeatures.length,
    simplified: simplifiedFeatures.length,
    total: geoJSONData.features.length,
  });

  return (
    <>
      <SimplifiedFeaturesLayerGroup features={simplifiedFeatures} />
      <DetailedFeaturesLayerGroup
        polygonFeatures={polygonFeatures}
        lineFeatures={lineFeatures}
        pointFeatures={pointFeatures}
      />
    </>
  );
}
