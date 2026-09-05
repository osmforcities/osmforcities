import type { FeatureCollection, Feature } from "geojson";
import { AGE_TS_KEY } from "./feature-age";

// Numeric epoch-seconds edit timestamp. Age buckets are computed at render
// time from this via ageStep (feature-age.ts), not baked per-feature; a
// missing `_ts` falls into the very-old bucket there, so unparsable or absent
// timestamps stamp nothing.
const featureTs = (feature: Feature): number | undefined => {
  const timestamp =
    feature.properties?.["@timestamp"] || feature.properties?.timestamp;
  if (!timestamp) return undefined;
  const ms = new Date(timestamp).getTime();
  return isNaN(ms) ? undefined : Math.floor(ms / 1000);
};

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
