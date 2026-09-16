import type { FeatureCollection } from "geojson";
import { AGE_TS_KEY, featureTs } from "./feature-age";

// Stamps the numeric epoch-seconds `_ts` the map paints from. Age buckets are
// computed at render time via ageStep (feature-age.ts), not baked per-feature;
// a missing `_ts` falls into the very-old bucket there, so unparsable or
// absent timestamps stamp nothing.
export const processOSMFeaturesForVisualization = (
  geojson: FeatureCollection
): FeatureCollection => {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const ts = featureTs(feature);
      if (ts === undefined) return feature;
      return {
        ...feature,
        properties: { ...feature.properties, [AGE_TS_KEY]: ts },
      };
    }),
  };
};
