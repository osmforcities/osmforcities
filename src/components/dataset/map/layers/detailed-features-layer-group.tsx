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

// Proxy circles carry small polygons at low zoom, then hand off to the real
// footprints as they become resolvable. Fully opaque through z13 so the circle
// hides its (still-tiny) polygon rather than letting it show through, then a
// quick crossfade to the resolved footprint by z14.
const PROXY_FADE = ["interpolate", ["linear"], ["zoom"], 13, 1, 14, 0];
import type { CuratedTheme } from "@/lib/curated-themes";
import { buildCuratedColorExpression } from "@/lib/curated-themes";
import { PALETTES } from "@/lib/map-palettes";

// Shared circle paint for the point + proxy-point layers. In a curated tag view
// the color comes from the theme expression; otherwise it falls back to the
// count-scaled default point style. Callers add their own opacity (e.g. the
// proxy fade) on top.
function buildThemePointPaint(themeColor: unknown[] | null, count: number) {
  return {
    ...POINT_STYLE,
    "circle-radius": themeColor ? 4 : buildPointRadiusForCount(count),
    "circle-color": themeColor ?? POINT_STYLE["circle-color"],
    "circle-stroke-color": themeColor
      ? PALETTES.categorical.stroke
      : POINT_STYLE["circle-stroke-color"],
    "circle-stroke-width": themeColor ? 1 : POINT_STYLE["circle-stroke-width"],
  };
}

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
  // Small polygons are subpixel at city-wide zoom, so they get a circle proxy
  // at their centroid until the real footprint resolves (~zoom 14). This must
  // apply to curated tag views too — otherwise a category made only of small
  // polygons (e.g. covered=roof) is invisible on the map. Proxies keep the
  // feature properties, so they colour by theme like any other point.
  const proxyPoints = useMemo(
    () => createSmallPolygonProxyPoints(polygonFeatures),
    [polygonFeatures]
  );

  const themeColor = useMemo(
    () => (curatedTheme ? buildCuratedColorExpression(curatedTheme) : null),
    [curatedTheme]
  );

  return (
    <>
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

      {/* Above the polygons so a small polygon's circle covers it at low zoom
          and crossfades out (PROXY_FADE) to reveal the real footprint by ~z14,
          instead of the subpixel polygon covering its own proxy */}
      {proxyPoints.length > 0 && (
        <MapLayer
          id="polygon-proxy-points"
          features={proxyPoints}
          layerType="circle"
          filter={visibilityFilter}
          paint={{
            ...buildThemePointPaint(themeColor, proxyPoints.length),
            "circle-opacity": PROXY_FADE,
            "circle-stroke-opacity": PROXY_FADE,
          }}
          layout={{ "circle-sort-key": AGE_SORT_KEY }}
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
          paint={buildThemePointPaint(themeColor, pointFeatures.length)}
          layout={themeColor ? undefined : { "circle-sort-key": AGE_SORT_KEY }}
        />
      )}
    </>
  );
}
