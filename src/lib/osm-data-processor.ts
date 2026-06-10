import type { FeatureCollection, Feature } from "geojson";
import type { DateFilter } from "../types/geojson";
import { getAvailableTimeframes, filterFeaturesByDate, calculateAge } from "./utils";

type FeatureAgeCategory = "recent" | "medium" | "older" | "very-old";

const categorizeFeatureByAge = (feature: Feature): FeatureAgeCategory => {
  const timestamp = feature.properties?.["@timestamp"] || feature.properties?.timestamp;
  if (!timestamp) return "very-old";
  
  const age = calculateAge(timestamp);
  if (age <= 7) return "recent";
  if (age <= 30) return "medium";
  if (age <= 90) return "older";
  return "very-old";
};

const addAgeCategoriesToFeatures = (geojson: FeatureCollection): FeatureCollection => {
  return {
    ...geojson,
    features: geojson.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        ageCategory: categorizeFeatureByAge(feature),
      },
    })),
  };
};

export const processOSMFeaturesForVisualization = (
  geojson: FeatureCollection,
  dateFilter: DateFilter = "all"
): FeatureCollection & { availableTimeframes: DateFilter[] } => {
  const featuresWithAgeCategories = addAgeCategoriesToFeatures(geojson);
  
  if (dateFilter === "all") {
    return {
      ...featuresWithAgeCategories,
      availableTimeframes: getAvailableTimeframes(geojson.features),
    };
  }

  const filteredFeatures = filterFeaturesByDate(featuresWithAgeCategories.features, dateFilter);

  return {
    ...featuresWithAgeCategories,
    features: filteredFeatures,
    availableTimeframes: getAvailableTimeframes(geojson.features),
  };
};
