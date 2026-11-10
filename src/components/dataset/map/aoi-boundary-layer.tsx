"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import { BOUNDARY_STYLE } from "./layers/map-style";
import { BASEMAP_LABELS_ANCHOR } from "@/lib/map-tiles";

type AoiBoundaryLayerProps = {
  boundary: FeatureCollection;
};

export function AoiBoundaryLayer({ boundary }: AoiBoundaryLayerProps) {
  return (
    <Source id="aoi-boundary" type="geojson" data={boundary}>
      <Layer
        id="aoi-boundary"
        type="line"
        beforeId={BASEMAP_LABELS_ANCHOR}
        paint={BOUNDARY_STYLE}
      />
    </Source>
  );
}
