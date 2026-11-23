import { useMemo } from "react";
import { computeInitialViewState } from "../../../../lib/utils";
import { datasetTilesPath } from "@/lib/dataset-tiles";
import type { Dataset } from "@/schemas/dataset";

type UseMapDataProps = {
  dataset: Dataset;
};

export function useMapData({ dataset }: UseMapDataProps) {
  const tilesPath = datasetTilesPath(dataset);

  const dataBounds = useMemo(
    () =>
      dataset.bbox && dataset.bbox.length === 4
        ? (dataset.bbox as [number, number, number, number])
        : null,
    [dataset.bbox]
  );

  const initialViewState = useMemo(
    () => computeInitialViewState(dataset.area, dataBounds),
    [dataset.area, dataBounds]
  );

  return {
    tilesPath,
    initialViewState,
    hasData: dataset.dataCount > 0,
  };
}
