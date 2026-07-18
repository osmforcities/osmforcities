import { useMemo } from "react";
import { FeatureCollection } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { processOSMFeaturesForVisualization } from "../../../../lib/osm-data-processor";
import { calculateBbox, computeInitialViewState } from "../../../../lib/utils";
import type { DateFilter } from "@/types/geojson";
import type { Dataset } from "@/schemas/dataset";

type UseMapDataProps = {
  dataset: Dataset;
  dateFilter: DateFilter;
};

export function useMapData({ dataset, dateFilter }: UseMapDataProps) {
  const processedData = useMemo(() => {
    if (!dataset.geojson) return null;

    try {
      const rawGeoJSONData = GeoJSONFeatureCollectionSchema.parse(
        dataset.geojson
      ) as FeatureCollection;

      return processOSMFeaturesForVisualization(rawGeoJSONData, dateFilter);
    } catch (error) {
      console.error("Error processing GeoJSON data:", error);
      return null;
    }
  }, [dataset.geojson, dateFilter]);

  const dataBounds = useMemo(() => {
    if (!processedData?.features?.length) return null;
    return calculateBbox(processedData);
  }, [processedData]);

  const initialViewState = useMemo(
    () => computeInitialViewState(dataset.area, dataBounds),
    [dataset.area, dataBounds]
  );

  const hasFilteredData = Boolean(processedData?.features?.length);

  return {
    processedData,
    dataBounds,
    initialViewState,
    hasFilteredData,
  };
}
