import { Source, Layer } from "react-map-gl/maplibre";
import type { FilterSpecification } from "maplibre-gl";
import type { Feature } from "geojson";
import { BASEMAP_LABELS_ANCHOR } from "@/lib/map-tiles";

type MapLayerProps = {
  id: string;
  features: Feature[];
  layerType: "fill" | "line" | "circle";
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: FilterSpecification;
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
  filter,
  strokeLayer,
}: MapLayerProps) {
  const filterProps = filter ? { filter } : undefined;
  return (
    <Source
      id={id}
      type="geojson"
      data={{ type: "FeatureCollection", features }}
    >
      <Layer
        id={id}
        type={layerType}
        beforeId={BASEMAP_LABELS_ANCHOR}
        paint={paint}
        {...(layout && { layout })}
        {...filterProps}
      />
      {strokeLayer && (
        <Layer
          id={strokeLayer.id}
          type={strokeLayer.type}
          beforeId={BASEMAP_LABELS_ANCHOR}
          paint={strokeLayer.paint}
          {...(strokeLayer.layout && { layout: strokeLayer.layout })}
          {...filterProps}
        />
      )}
    </Source>
  );
}
