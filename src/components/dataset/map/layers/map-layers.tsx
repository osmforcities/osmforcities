import { useMemo } from "react";
import type { Feature } from "geojson";
import type { FilterSpecification } from "maplibre-gl";
import { DetailedFeaturesLayerGroup } from ".";
import type { CuratedTheme } from "@/lib/curated-themes";

type MapLayersProps = {
  geoJSONData: {
    features: Feature[];
  };
  curatedTheme: CuratedTheme | null;
  visibilityFilter?: FilterSpecification;
};

export function MapLayers({
  geoJSONData,
  curatedTheme,
  visibilityFilter,
}: MapLayersProps) {
  // Stable array identities so downstream geometry work (proxy centroids)
  // only recomputes when the data actually changes
  const { polygonFeatures, lineFeatures, pointFeatures } = useMemo(
    () => ({
      polygonFeatures: geoJSONData.features.filter(
        (f: Feature) =>
          f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
      ),
      lineFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "LineString"
      ),
      pointFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "Point"
      ),
    }),
    [geoJSONData.features]
  );

  return (
    <DetailedFeaturesLayerGroup
      polygonFeatures={polygonFeatures}
      lineFeatures={lineFeatures}
      pointFeatures={pointFeatures}
      curatedTheme={curatedTheme}
      visibilityFilter={visibilityFilter}
    />
  );
}
