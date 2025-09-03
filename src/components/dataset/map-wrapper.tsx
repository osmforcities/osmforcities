"use client";

import { DatasetFullMap } from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";

type DatasetMapWrapperProps = {
  dataset: Dataset;
};

export function DatasetMapWrapper({ dataset }: DatasetMapWrapperProps) {
  return <DatasetFullMap dataset={dataset} />;
}
