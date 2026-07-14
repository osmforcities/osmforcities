import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import {
  POLYGON_STYLE,
  LINE_STYLE,
  POINT_STYLE,
  buildPointRadiusForCount,
} from "./map-layers";
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
          paint={POLYGON_STYLE.fill}
          strokeLayer={{
            id: "detailed-polygons-stroke",
            type: "line",
            paint: POLYGON_STYLE.stroke,
          }}
        />
      )}

      {lineFeatures.length > 0 && (
        <MapLayer
          id="detailed-lines"
          features={lineFeatures}
          layerType="line"
          paint={LINE_STYLE}
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
              : buildPointRadiusForCount(pointFeatures.length),
            "circle-color": categoricalTheme
              ? buildCircleColorExpression(categoricalTheme)
              : POINT_STYLE["circle-color"],
            "circle-stroke-color": categoricalTheme
              ? PALETTES.categorical.stroke
              : POINT_STYLE["circle-stroke-color"],
            "circle-stroke-width": categoricalTheme ? 1 : POINT_STYLE["circle-stroke-width"],
          }}
        />
      )}
    </>
  );
}
