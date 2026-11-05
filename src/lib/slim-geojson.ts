import type { FeatureCollection, Geometry } from "geojson";

type Coordinates = number | Coordinates[];

// 6 decimals ~ 0.1m precision, plenty for map rendering
const truncateCoordinates = (coords: Coordinates): Coordinates =>
  typeof coords === "number"
    ? Math.round(coords * 1e6) / 1e6
    : coords.map(truncateCoordinates);

const truncateGeometry = (geometry: Geometry): Geometry => {
  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries.map(truncateGeometry),
    };
  }
  return {
    ...geometry,
    coordinates: truncateCoordinates(geometry.coordinates) as never,
  };
};

// Keeps the default view tag so the homepage featured map opens on the dataset
// page's view. Age buckets stay client-side: the response is cached, age is relative to now
export const toSlimGeojson = (
  geojson: FeatureCollection,
  defaultView: string | null
): FeatureCollection<Geometry | null> => ({
  type: "FeatureCollection",
  features: geojson.features.map((feature) => {
    const timestamp =
      feature.properties?.["@timestamp"] ?? feature.properties?.timestamp;
    const viewValue = defaultView && feature.properties?.[defaultView];
    return {
      type: "Feature" as const,
      geometry: feature.geometry ? truncateGeometry(feature.geometry) : null,
      properties: {
        ...(timestamp != null && { "@timestamp": timestamp }),
        ...(defaultView && viewValue != null && { [defaultView]: viewValue }),
      },
    };
  }),
});
