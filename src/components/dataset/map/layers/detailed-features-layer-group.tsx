import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import { POLYGON_STYLE, LINE_STYLE, POINT_STYLE } from "./map-layers";
import { createDetailedOpacityExpression } from "./expressions";

type DetailedFeaturesLayerGroupProps = {
  polygonFeatures: Feature[];
  lineFeatures: Feature[];
  pointFeatures: Feature[];
};

export function DetailedFeaturesLayerGroup({
  polygonFeatures,
  lineFeatures,
  pointFeatures,
}: DetailedFeaturesLayerGroupProps) {
  return (
    <>
      {polygonFeatures.length > 0 && (
        <MapLayer
          id="detailed-polygons"
          features={polygonFeatures}
          layerType="fill"
          paint={{
            ...POLYGON_STYLE.fill,
            "fill-opacity": createDetailedOpacityExpression(
              POLYGON_STYLE.fill["fill-opacity"]
            ),
          }}
          strokeLayer={{
            id: "detailed-polygons-stroke",
            type: "line",
            paint: {
              ...POLYGON_STYLE.stroke,
              "line-opacity": createDetailedOpacityExpression(
                POLYGON_STYLE.stroke["line-opacity"]
              ),
            },
          }}
        />
      )}

      {lineFeatures.length > 0 && (
        <MapLayer
          id="detailed-lines"
          features={lineFeatures}
          layerType="line"
          paint={{
            ...LINE_STYLE,
            "line-opacity": createDetailedOpacityExpression(
              LINE_STYLE["line-opacity"]
            ),
          }}
        />
      )}

      {pointFeatures.length > 0 && (
        <MapLayer
          id="detailed-points"
          features={pointFeatures}
          layerType="circle"
          paint={{
            ...POINT_STYLE,
            "circle-opacity": createDetailedOpacityExpression(
              POINT_STYLE["circle-opacity"]
            ),
            "circle-stroke-opacity": createDetailedOpacityExpression(0.9),
          }}
        />
      )}
    </>
  );
}
