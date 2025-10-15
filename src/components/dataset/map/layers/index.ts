// Main entry point - orchestrates all layer components
export { MapLayers } from "./map-layers";

// Layer group components
export { SimplifiedFeaturesLayerGroup } from "./simplified-features-layer-group";
export { DetailedFeaturesLayerGroup } from "./detailed-features-layer-group";

// Utility components
export { MapLayer } from "./map-layer";

// Expression utilities for styling
export {
  createAgeColorExpression,
  createSimplifiedOpacityExpression,
  createDetailedOpacityExpression,
} from "./expressions";
