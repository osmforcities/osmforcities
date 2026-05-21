"use client";

import { forwardRef } from "react";
import { DatasetFullMap, type DatasetFullMapHandle } from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import type { Feature, FeatureCollection } from "geojson";

type DatasetMapWrapperProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
  onFeatureSelect?: (feature: Feature | null) => void;
};

export type { DatasetFullMapHandle };

export const DatasetMapWrapper = forwardRef<DatasetFullMapHandle, DatasetMapWrapperProps>(
  ({ dataset, boundary, onFeatureSelect }, ref) => {
    return <DatasetFullMap ref={ref} dataset={dataset} boundary={boundary} onFeatureSelect={onFeatureSelect} />;
  }
);

DatasetMapWrapper.displayName = "DatasetMapWrapper";
