import { useMemo } from "react";
import { Feature } from "geojson";
import { MapLayer } from "./map-layer";
import {
  POLYGON_STYLE,
  LINE_STYLE,
  POINT_STYLE,
  AGE_SORT_KEY,
  buildPointRadiusForCount,
} from "./map-style";
import { createSmallPolygonProxyPoints } from "./polygon-proxy-points";

// Proxy circles carry small polygons at low zoom, then hand off to the
// real footprints as they become resolvable
const PROXY_FADE = ["interpolate", ["linear"], ["zoom"], 12.5, 0.9, 14, 0];
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
  const proxyPoints = useMemo(
    () =>
      categoricalTheme ? [] : createSmallPolygonProxyPoints(polygonFeatures),
    [categoricalTheme, polygonFeatures]
  );

  return (
    <>
      {proxyPoints.length > 0 && (
        <MapLayer
          id="polygon-proxy-points"
          features={proxyPoints}
          layerType="circle"
          paint={{
            ...POINT_STYLE,
            "circle-radius": buildPointRadiusForCount(proxyPoints.length),
            "circle-opacity": PROXY_FADE,
            "circle-stroke-opacity": PROXY_FADE,
          }}
          layout={{ "circle-sort-key": AGE_SORT_KEY }}
        />
      )}

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
          layout={{ "line-sort-key": AGE_SORT_KEY }}
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
          layout={
            categoricalTheme ? undefined : { "circle-sort-key": AGE_SORT_KEY }
          }
        />
      )}
    </>
  );
}
