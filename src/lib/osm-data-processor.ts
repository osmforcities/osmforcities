import type { FeatureCollection, Feature } from "geojson";
import { calculateAge } from "./utils";

type FeatureAgeCategory = "recent" | "medium" | "older" | "very-old";

const categorizeFeatureByAge = (feature: Feature): FeatureAgeCategory => {
  const timestamp = feature.properties?.["@timestamp"] || feature.properties?.timestamp;
  if (!timestamp) return "very-old";

  // Unparsable timestamps get the same fallback as missing ones; calculateAge
  // would return 0 and mislabel them as recent edits
  if (isNaN(new Date(timestamp).getTime())) return "very-old";

  const age = calculateAge(timestamp);
  if (age <= 7) return "recent";
  if (age <= 30) return "medium";
  if (age <= 90) return "older";
  return "very-old";
};

export const processOSMFeaturesForVisualization = (
  geojson: FeatureCollection
): FeatureCollection => {
  return {
    ...geojson,
    features: geojson.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        ageCategory: categorizeFeatureByAge(feature),
      },
    })),
  };
};
