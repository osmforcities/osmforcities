"use client";

import { forwardRef } from "react";
import { DatasetFullMap, type DatasetFullMapHandle } from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import type { Feature } from "geojson";

type DatasetMapWrapperProps = {
  dataset: Dataset;
  onFeatureSelect?: (feature: Feature | null) => void;
};

export type { DatasetFullMapHandle };

export const DatasetMapWrapper = forwardRef<DatasetFullMapHandle, DatasetMapWrapperProps>(
  ({ dataset, onFeatureSelect }, ref) => {
    return <DatasetFullMap ref={ref} dataset={dataset} onFeatureSelect={onFeatureSelect} />;
  }
);

DatasetMapWrapper.displayName = "DatasetMapWrapper";
