import { useCallback } from "react";
import type { Dataset } from "@/schemas/dataset";

export function useDatasetDownload() {
  const downloadDataset = useCallback(async (dataset: Dataset) => {
    if (!dataset.hasGeojson) return;

    const defaultFilename = `${dataset.template.name}-${dataset.cityName}.geojson`;

    const response = await fetch(`/api/datasets/${dataset.id}/export`);
    if (!response.ok) {
      console.error(`Export API error: ${response.status}`);
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const match = contentDisposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? defaultFilename;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadDataset };
}
