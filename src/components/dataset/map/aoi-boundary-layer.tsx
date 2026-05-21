"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";

type AoiBoundaryLayerProps = {
  boundary: FeatureCollection;
};

export function AoiBoundaryLayer({ boundary }: AoiBoundaryLayerProps) {
  return (
    <Source id="aoi-boundary" type="geojson" data={boundary}>
      <Layer
        id="aoi-boundary"
        type="line"
        paint={{
          "line-color": "#0b4ad8",
          "line-width": 2,
          "line-dasharray": [3, 3],
          "line-opacity": 0.5,
        }}
      />
    </Source>
  );
}
