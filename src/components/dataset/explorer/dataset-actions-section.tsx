"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import DatasetWatchButton from "@/components/dataset/watch-button";
import DatasetRefreshButton from "@/components/dataset/refresh-button";
import { useDatasetDownload } from "@/hooks/useDatasetDownload";

type DatasetActionsSectionProps = {
  dataset: Dataset;
};

export function DatasetActionsSection({ dataset }: DatasetActionsSectionProps) {
  const t = useTranslations("DatasetExplorer");
  const { downloadDataset } = useDatasetDownload();

  return (
    <div className="pb-8">
      <div className="border-t border-gray-200 my-4"></div>
      <div className="mt-4 flex justify-center items-center gap-3">
        {/* Interactive Actions */}
        <div className="flex items-center gap-2">
          <DatasetWatchButton
            datasetId={dataset.id}
            isWatched={dataset.isWatched || false}
            isPublic={dataset.isPublic}
          />
          <DatasetRefreshButton
            datasetId={dataset.id}
            isActive={dataset.isActive}
          />
        </div>

        {/* Visual Separator */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Data Export */}
        <Button
          onClick={() => downloadDataset(dataset)}
          disabled={!dataset.geojson}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("downloadData")}
        </Button>
      </div>
    </div>
  );
}
