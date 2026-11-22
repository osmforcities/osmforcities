"use client";

import { forwardRef } from "react";
import { DatasetFullMap, type DatasetFullMapHandle } from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import type { FeatureSelectHandler } from "@/components/dataset/map/hooks";

type DatasetMapWrapperProps = {
  dataset: Dataset;
  boundary: FeatureCollection | null;
  onFeatureSelect?: FeatureSelectHandler;
};

export type { DatasetFullMapHandle };

export const DatasetMapWrapper = forwardRef<DatasetFullMapHandle, DatasetMapWrapperProps>(
  ({ dataset, boundary, onFeatureSelect }, ref) => {
    return <DatasetFullMap ref={ref} dataset={dataset} boundary={boundary} onFeatureSelect={onFeatureSelect} />;
  }
);

DatasetMapWrapper.displayName = "DatasetMapWrapper";
