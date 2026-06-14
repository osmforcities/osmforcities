import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import { AGE_COLORS, AGE_STROKE_COLORS } from "./map-layers";
import {
  createAgeColorExpression,
  createSimplifiedOpacityExpression,
} from "./expressions";
import type { CategoricalTheme } from "@/lib/map-themes";
import { buildCircleColorExpression, buildCircleRadiusExpression } from "./expressions";
import { PALETTES } from "@/lib/map-themes/palettes";

type SimplifiedFeaturesLayerGroupProps = {
  features: Feature[];
  categoricalTheme: CategoricalTheme | null;
};

export function SimplifiedFeaturesLayerGroup({
  features,
  categoricalTheme,
}: SimplifiedFeaturesLayerGroupProps) {
  if (features.length === 0) return null;

  // Apply categorical theme if available, otherwise use age-based colors
  const circleColor = categoricalTheme
    ? buildCircleColorExpression(categoricalTheme)
    : createAgeColorExpression(AGE_COLORS);

  const circleStrokeColor = categoricalTheme
    ? PALETTES.categorical.stroke
    : createAgeColorExpression(AGE_STROKE_COLORS);

  const circleRadius = categoricalTheme
    ? buildCircleRadiusExpression(categoricalTheme, 3)
    : 3;

  return (
    <MapLayer
      id="simplified-features"
      features={features}
      layerType="circle"
      paint={{
        "circle-radius": circleRadius as number,
        "circle-color": circleColor,
        "circle-opacity": createSimplifiedOpacityExpression(0.6),
        "circle-stroke-width": 1,
        "circle-stroke-color": circleStrokeColor,
        "circle-stroke-opacity": createSimplifiedOpacityExpression(0.7),
      }}
    />
  );
}
