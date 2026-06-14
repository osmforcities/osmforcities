import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import { POLYGON_STYLE, LINE_STYLE, POINT_STYLE } from "./map-layers";
import { createDetailedOpacityExpression } from "./expressions";
import type { CategoricalTheme } from "@/lib/map-themes";
import { buildCircleColorExpression, buildCircleRadiusExpression } from "./expressions";
import { PALETTES } from "@/lib/map-themes/palettes";

type DetailedFeaturesLayerGroupProps = {
  polygonFeatures: Feature[];
  lineFeatures: Feature[];
  pointFeatures: Feature[];
  categoricalTheme: CategoricalTheme | null;
};

export function DetailedFeaturesLayerGroup({
  polygonFeatures,
  lineFeatures,
  pointFeatures,
  categoricalTheme,
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
            "circle-radius": categoricalTheme
              ? buildCircleRadiusExpression(categoricalTheme, 4) as number
              : POINT_STYLE["circle-radius"],
            "circle-color": categoricalTheme
              ? buildCircleColorExpression(categoricalTheme)
              : POINT_STYLE["circle-color"],
            "circle-opacity": createDetailedOpacityExpression(
              POINT_STYLE["circle-opacity"]
            ),
            "circle-stroke-color": categoricalTheme
              ? PALETTES.categorical.stroke
              : POINT_STYLE["circle-stroke-color"],
            "circle-stroke-width": categoricalTheme ? 1 : POINT_STYLE["circle-stroke-width"],
            "circle-stroke-opacity": createDetailedOpacityExpression(0.9),
          }}
        />
      )}
    </>
  );
}
