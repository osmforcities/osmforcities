import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import { AGE_COLORS, AGE_STROKE_COLORS } from "./map-layers";
import {
  createAgeColorExpression,
  createSimplifiedOpacityExpression,
} from "./expressions";

type SimplifiedFeaturesLayerGroupProps = {
  features: Feature[];
};

export function SimplifiedFeaturesLayerGroup({
  features,
}: SimplifiedFeaturesLayerGroupProps) {
  if (features.length === 0) return null;

  return (
    <MapLayer
      id="simplified-features"
      features={features}
      layerType="circle"
      paint={{
        "circle-radius": 3,
        "circle-color": createAgeColorExpression(AGE_COLORS),
        "circle-opacity": createSimplifiedOpacityExpression(0.6),
        "circle-stroke-width": 1,
        "circle-stroke-color": createAgeColorExpression(AGE_STROKE_COLORS),
        "circle-stroke-opacity": createSimplifiedOpacityExpression(0.7),
      }}
    />
  );
}
