"use client";

import { DatasetFullMap } from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import type { Feature } from "geojson";

type DatasetMapWrapperProps = {
  dataset: Dataset;
  onFeatureSelect?: (feature: Feature | null) => void;
};

export function DatasetMapWrapper({ dataset, onFeatureSelect }: DatasetMapWrapperProps) {
  return <DatasetFullMap dataset={dataset} onFeatureSelect={onFeatureSelect} />;
}
