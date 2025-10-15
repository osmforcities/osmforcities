import { useCallback } from "react";
import type { Dataset } from "@/schemas/dataset";

export function useDatasetDownload() {
  const downloadDataset = useCallback((dataset: Dataset) => {
    if (!dataset.geojson) return;

    const blob = new Blob([JSON.stringify(dataset.geojson, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset.template.name}-${dataset.cityName}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadDataset };
}
