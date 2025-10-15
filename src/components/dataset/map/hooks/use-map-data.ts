import { useMemo } from "react";
import { FeatureCollection } from "geojson";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { processOSMFeaturesForVisualization } from "../../../../lib/osm-data-processor";
import { calculateBbox } from "../../../../lib/utils";
import type { DateFilter } from "@/types/geojson";

type UseMapDataProps = {
  dataset: { geojson: unknown };
  dateFilter: DateFilter;
};

export function useMapData({ dataset, dateFilter }: UseMapDataProps) {
  // Memoize data processing to avoid unnecessary recalculations
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

  // Memoize bounds calculation
  const dataBounds = useMemo(() => {
    if (!processedData?.features?.length) return null;
    return calculateBbox(processedData);
  }, [processedData]);

  // Memoize initial view state
  const initialViewState = useMemo(() => {
    if (!dataBounds) {
      return {
        longitude: 0,
        latitude: 0,
        zoom: 2,
      };
    }

    return {
      bounds: [dataBounds[0], dataBounds[1], dataBounds[2], dataBounds[3]] as [
        number,
        number,
        number,
        number
      ],
      fitBoundsOptions: { padding: 20 },
    };
  }, [dataBounds]);

  const hasFilteredData = Boolean(processedData?.features?.length);

  return {
    processedData,
    dataBounds,
    initialViewState,
    hasFilteredData,
  };
}
