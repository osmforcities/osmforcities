import { useMemo } from "react";
import { Feature } from "geojson";
import type { FilterSpecification } from "maplibre-gl";
import { MapLayer } from "./map-layer";
import {
  POLYGON_STYLE,
  LINE_STYLE,
  POINT_STYLE,
  AGE_SORT_KEY,
  buildPointRadiusForCount,
  buildPolygonStrokeWidth,
  buildLineWidth,
  DEFAULT_STYLE_KNOBS,
} from "./map-style";
import { createSmallPolygonProxyPoints } from "./polygon-proxy-points";

// Proxy circles carry small polygons at low zoom, then hand off to the
// real footprints as they become resolvable
const PROXY_FADE = ["interpolate", ["linear"], ["zoom"], 12.5, 0.9, 14, 0];
import type { CuratedTheme } from "@/lib/curated-themes";
import { buildCuratedColorExpression } from "@/lib/curated-themes";
import { PALETTES } from "@/lib/map-palettes";

type DetailedFeaturesLayerGroupProps = {
  polygonFeatures: Feature[];
  lineFeatures: Feature[];
  pointFeatures: Feature[];
  curatedTheme: CuratedTheme | null;
  visibilityFilter?: FilterSpecification;
};

export function DetailedFeaturesLayerGroup({
  polygonFeatures,
  lineFeatures,
  pointFeatures,
  curatedTheme,
  visibilityFilter,
}: DetailedFeaturesLayerGroupProps) {
  const proxyPoints = useMemo(
    () => (curatedTheme ? [] : createSmallPolygonProxyPoints(polygonFeatures)),
    [curatedTheme, polygonFeatures]
  );

  const themeColor = useMemo(
    () => (curatedTheme ? buildCuratedColorExpression(curatedTheme) : null),
    [curatedTheme]
  );

  return (
    <>
      {proxyPoints.length > 0 && (
        <MapLayer
          id="polygon-proxy-points"
          features={proxyPoints}
          layerType="circle"
          filter={visibilityFilter}
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
          filter={visibilityFilter}
          paint={
            themeColor
              ? { "fill-color": themeColor, "fill-opacity": 0.7 }
              : POLYGON_STYLE.fill
          }
          strokeLayer={{
            id: "detailed-polygons-stroke",
            type: "line",
            paint: themeColor
              ? {
                  "line-color": themeColor,
                  "line-width": buildPolygonStrokeWidth(DEFAULT_STYLE_KNOBS),
                  "line-opacity": 0.9,
                }
              : POLYGON_STYLE.stroke,
          }}
        />
      )}

      {lineFeatures.length > 0 && (
        <MapLayer
          id="detailed-lines"
          features={lineFeatures}
          layerType="line"
          filter={visibilityFilter}
          paint={
            themeColor
              ? {
                  "line-color": themeColor,
                  "line-width": buildLineWidth(DEFAULT_STYLE_KNOBS),
                  "line-opacity": 0.9,
                }
              : LINE_STYLE
          }
          layout={themeColor ? undefined : { "line-sort-key": AGE_SORT_KEY }}
        />
      )}

      {pointFeatures.length > 0 && (
        <MapLayer
          id="detailed-points"
          features={pointFeatures}
          layerType="circle"
          filter={visibilityFilter}
          paint={{
            ...POINT_STYLE,
            "circle-radius": themeColor
              ? 4
              : buildPointRadiusForCount(pointFeatures.length),
            "circle-color": themeColor ?? POINT_STYLE["circle-color"],
            "circle-stroke-color": themeColor
              ? PALETTES.categorical.stroke
              : POINT_STYLE["circle-stroke-color"],
            "circle-stroke-width": themeColor
              ? 1
              : POINT_STYLE["circle-stroke-width"],
          }}
          layout={themeColor ? undefined : { "circle-sort-key": AGE_SORT_KEY }}
        />
      )}
    </>
  );
}
