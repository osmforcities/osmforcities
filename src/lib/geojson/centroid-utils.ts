import { Feature } from "geojson";
import { centroid } from "@turf/centroid";

export function createSimplifiedFeatures(
  polygonFeatures: Feature[],
  lineFeatures: Feature[],
  pointFeatures: Feature[]
): Feature[] {
  const simplifiedFeatures: Feature[] = [];

  polygonFeatures.forEach((feature) => {
    const centroidPoint = centroid(feature);
    if (centroidPoint) {
      simplifiedFeatures.push({
        ...feature,
        geometry: centroidPoint.geometry,
        properties: {
          ...feature.properties,
          originalType: "polygon",
          featureId: feature.id || Math.random().toString(),
        },
      });
    }
  });

  lineFeatures.forEach((feature) => {
    const centroidPoint = centroid(feature);
    if (centroidPoint) {
      simplifiedFeatures.push({
        ...feature,
        geometry: centroidPoint.geometry,
        properties: {
          ...feature.properties,
          originalType: "line",
          featureId: feature.id || Math.random().toString(),
        },
      });
    }
  });

  pointFeatures.forEach((feature) => {
    simplifiedFeatures.push({
      ...feature,
      properties: {
        ...feature.properties,
        originalType: "point",
        featureId: feature.id || Math.random().toString(),
      },
    });
  });

  return simplifiedFeatures;
}
