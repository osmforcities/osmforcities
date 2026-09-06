import { useCallback } from "react";
import type { Dataset } from "@/schemas/dataset";

export function useDatasetDownload() {
  const downloadDataset = useCallback(async (dataset: Dataset) => {
    // hasGeojson covers payloads whose FeatureCollection was stripped because
    // tiles render — the export API reads the DB row, so download still works.
    if (!(dataset.hasGeojson ?? Boolean(dataset.geojson))) return;

    const defaultFilename = `${dataset.template.name}-${dataset.cityName}.geojson`;

    try {
      const response = await fetch(`/api/datasets/${dataset.id}/export`);
      if (!response.ok) {
        throw new Error(`Export API error: ${response.status}`);
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
    } catch {
      // Inline fallback needs the payload to actually hold the features —
      // a tiles-render payload stripped them, so there is nothing to save.
      if (!dataset.geojson) return;
      const blob = new Blob([JSON.stringify(dataset.geojson, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, []);

  return { downloadDataset };
}
