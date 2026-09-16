import { useMemo } from "react";
import { FeatureCollection } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { processOSMFeaturesForVisualization } from "../../../../lib/osm-data-processor";
import { calculateBbox, computeInitialViewState } from "../../../../lib/utils";
import { datasetTilesPath } from "@/lib/dataset-tiles";
import type { Dataset } from "@/schemas/dataset";

type UseMapDataProps = {
  dataset: Dataset;
};

export function useMapData({ dataset }: UseMapDataProps) {
  // Tiles mode: the map reads the PMTiles archive; no client-side feature
  // processing at all (that is the point — #489).
  const tilesPath = datasetTilesPath(dataset);

  const processedData = useMemo(() => {
    if (tilesPath || !dataset.geojson) return null;

    try {
      const rawGeoJSONData = GeoJSONFeatureCollectionSchema.parse(
        dataset.geojson
      ) as FeatureCollection;

      return processOSMFeaturesForVisualization(rawGeoJSONData);
    } catch (error) {
      console.error("Error processing GeoJSON data:", error);
      return null;
    }
  }, [dataset.geojson, tilesPath]);

  const dataBounds = useMemo(() => {
    // Stored bbox stands in for the feature-derived bounds when no features
    // are held client-side (written at snapshot / tiles pull time).
    if (tilesPath) {
      return dataset.bbox && dataset.bbox.length === 4
        ? (dataset.bbox as [number, number, number, number])
        : null;
    }
    if (!processedData?.features?.length) return null;
    return calculateBbox(processedData);
  }, [tilesPath, dataset.bbox, processedData]);

  const initialViewState = useMemo(
    () => computeInitialViewState(dataset.area, dataBounds),
    [dataset.area, dataBounds]
  );

  const hasFilteredData = tilesPath
    ? dataset.dataCount > 0
    : Boolean(processedData?.features?.length);

  return {
    processedData,
    tilesPath,
    dataBounds,
    initialViewState,
    hasFilteredData,
  };
}
