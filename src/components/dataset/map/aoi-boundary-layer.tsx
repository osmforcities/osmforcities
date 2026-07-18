"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import { BOUNDARY_STYLE } from "./layers/map-style";

type AoiBoundaryLayerProps = {
  boundary: FeatureCollection;
};

export function AoiBoundaryLayer({ boundary }: AoiBoundaryLayerProps) {
  return (
    <Source id="aoi-boundary" type="geojson" data={boundary}>
      <Layer id="aoi-boundary" type="line" paint={BOUNDARY_STYLE} />
    </Source>
  );
}
