import { Source, Layer } from "react-map-gl/maplibre";
import type { Feature } from "geojson";

// Age-based color scheme
const AGE_COLORS = {
  recent: "#22c55e",     // Green - very recently changed (≤7 days)
  medium: "#f97316",     // Orange - recently changed (8-30 days)
  older: "#eab308",      // Yellow - somewhat recently changed (31-90 days)
  "very-old": "#6b7280", // Gray - older features (>90 days)
};

const AGE_STROKE_COLORS = {
  recent: "#16a34a",     // Darker green
  medium: "#ea580c",     // Darker orange
  older: "#ca8a04",      // Darker yellow
  "very-old": "#4b5563", // Darker gray
};

const POLYGON_STYLE = {
  fill: {
    "fill-color": [
      "case",
      ["==", ["get", "ageCategory"], "recent"], AGE_COLORS.recent,
      ["==", ["get", "ageCategory"], "medium"], AGE_COLORS.medium,
      ["==", ["get", "ageCategory"], "older"], AGE_COLORS.older,
      AGE_COLORS["very-old"], // default
    ],
    "fill-opacity": 0.7,
  },
  stroke: {
    "line-color": [
      "case",
      ["==", ["get", "ageCategory"], "recent"], AGE_STROKE_COLORS.recent,
      ["==", ["get", "ageCategory"], "medium"], AGE_STROKE_COLORS.medium,
      ["==", ["get", "ageCategory"], "older"], AGE_STROKE_COLORS.older,
      AGE_STROKE_COLORS["very-old"], // default
    ],
    "line-width": 1.5,
    "line-opacity": 0.9,
  },
};

const LINE_STYLE = {
  "line-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"], AGE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"], AGE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"], AGE_COLORS.older,
    AGE_COLORS["very-old"], // default
  ],
  "line-width": 2,
  "line-opacity": 0.9,
};

const POINT_STYLE = {
  "circle-radius": 6,
  "circle-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"], AGE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"], AGE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"], AGE_COLORS.older,
    AGE_COLORS["very-old"], // default
  ],
  "circle-opacity": 0.9,
  "circle-stroke-width": 1,
  "circle-stroke-color": [
    "case",
    ["==", ["get", "ageCategory"], "recent"], AGE_STROKE_COLORS.recent,
    ["==", ["get", "ageCategory"], "medium"], AGE_STROKE_COLORS.medium,
    ["==", ["get", "ageCategory"], "older"], AGE_STROKE_COLORS.older,
    AGE_STROKE_COLORS["very-old"], // default
  ],
};

type MapLayerProps = {
  id: string;
  features: Feature[];
  layerType: "fill" | "line" | "circle";
  paint: Record<string, unknown>;
  strokeLayer?: {
    id: string;
    type: "fill" | "line" | "circle";
    paint: Record<string, unknown>;
  };
};

function MapLayer({
  id,
  features,
  layerType,
  paint,
  strokeLayer,
}: MapLayerProps) {
  return (
    <Source
      id={id}
      type="geojson"
      data={{ type: "FeatureCollection", features }}
    >
      <Layer id={id} type={layerType} paint={paint} />
      {strokeLayer && (
        <Layer
          id={strokeLayer.id}
          type={strokeLayer.type}
          paint={strokeLayer.paint}
        />
      )}
    </Source>
  );
}

type MapLayersProps = {
  geoJSONData: {
    features: Feature[];
  };
};

export function MapLayers({ geoJSONData }: MapLayersProps) {
  return (
    <>
      <MapLayer
        id="dataset-polygons"
        features={geoJSONData.features.filter(
          (f: Feature) =>
            f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
        )}
        layerType="fill"
        paint={POLYGON_STYLE.fill}
        strokeLayer={{
          id: "data-polygons-stroke",
          type: "line",
          paint: POLYGON_STYLE.stroke,
        }}
      />

      <MapLayer
        id="dataset-lines"
        features={geoJSONData.features.filter(
          (f: Feature) => f.geometry.type === "LineString"
        )}
        layerType="line"
        paint={LINE_STYLE}
      />

      <MapLayer
        id="dataset-points"
        features={geoJSONData.features.filter(
          (f: Feature) => f.geometry.type === "Point"
        )}
        layerType="circle"
        paint={POINT_STYLE}
      />
    </>
  );
}
