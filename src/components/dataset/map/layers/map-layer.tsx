import { Source, Layer } from "react-map-gl/maplibre";
import type { Feature } from "geojson";

type MapLayerProps = {
  id: string;
  features: Feature[];
  layerType: "fill" | "line" | "circle";
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  strokeLayer?: {
    id: string;
    type: "fill" | "line" | "circle";
    paint: Record<string, unknown>;
    layout?: Record<string, unknown>;
  };
};

export function MapLayer({
  id,
  features,
  layerType,
  paint,
  layout,
  strokeLayer,
}: MapLayerProps) {
  return (
    <Source
      id={id}
      type="geojson"
      data={{ type: "FeatureCollection", features }}
    >
      <Layer
        id={id}
        type={layerType}
        paint={paint}
        {...(layout && { layout })}
      />
      {strokeLayer && (
        <Layer
          id={strokeLayer.id}
          type={strokeLayer.type}
          paint={strokeLayer.paint}
          {...(strokeLayer.layout && { layout: strokeLayer.layout })}
        />
      )}
    </Source>
  );
}
