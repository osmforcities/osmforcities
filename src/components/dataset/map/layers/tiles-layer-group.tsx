import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { FilterSpecification } from "maplibre-gl";
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
import {
  POLYGON_LAYER_ID,
  POLYGON_STROKE_LAYER_ID,
  LINE_LAYER_ID,
  POINT_LAYER_ID,
} from "./layer-ids";
import type { CuratedTheme } from "@/lib/curated-themes";
import { BASEMAP_LABELS_ANCHOR } from "@/lib/map-tiles";
import { TILES_SOURCE_LAYER } from "@/lib/dataset-tiles";
import { buildCuratedColorExpression } from "@/lib/curated-themes";
import { PALETTES } from "@/lib/map-palettes";

const TILES_SOURCE_ID = "dataset-tiles";

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

function buildThemePolygonFillPaint(themeColor: unknown[] | null) {
  return themeColor
    ? { "fill-color": themeColor, "fill-opacity": 0.7 }
    : POLYGON_STYLE.fill;
}

function buildThemePolygonStrokePaint(themeColor: unknown[] | null) {
  return themeColor
    ? {
        "line-color": themeColor,
        "line-width": buildPolygonStrokeWidth(DEFAULT_STYLE_KNOBS),
        "line-opacity": 0.9,
      }
    : POLYGON_STYLE.stroke;
}

function buildThemeLinePaint(themeColor: unknown[] | null) {
  return themeColor
    ? {
        "line-color": themeColor,
        "line-width": buildLineWidth(DEFAULT_STYLE_KNOBS),
        "line-opacity": 0.9,
      }
    : LINE_STYLE;
}

// ["geometry-type"] folds Multi* into the base type, so three filters cover
// every feature.
function geometryFilter(
  type: "Polygon" | "LineString" | "Point",
  visibilityFilter?: FilterSpecification
): FilterSpecification {
  const geom = ["==", ["geometry-type"], type];
  return (
    visibilityFilter ? ["all", geom, visibilityFilter] : geom
  ) as FilterSpecification;
}

type TilesLayerGroupProps = {
  /** pmtiles:// URL of the archive. */
  tilesUrl: string;
  /** Sizes the default point radius. */
  pointCount: number;
  curatedTheme: CuratedTheme | null;
  visibilityFilter?: FilterSpecification;
};

export function TilesLayerGroup({
  tilesUrl,
  pointCount,
  curatedTheme,
  visibilityFilter,
}: TilesLayerGroupProps) {
  const themeColor = useMemo(
    () => (curatedTheme ? buildCuratedColorExpression(curatedTheme) : null),
    [curatedTheme]
  );

  // Loose paint typing: the builders emit expression arrays that MapLibre's
  // strict literal types reject at compile time.
  const fillPaint: Record<string, unknown> = buildThemePolygonFillPaint(themeColor);
  const strokePaint: Record<string, unknown> =
    buildThemePolygonStrokePaint(themeColor);
  const linePaint: Record<string, unknown> = buildThemeLinePaint(themeColor);
  const pointPaint: Record<string, unknown> = buildThemePointPaint(
    themeColor,
    pointCount
  );
  const lineLayout: Record<string, unknown> | undefined = themeColor
    ? undefined
    : { "line-sort-key": AGE_SORT_KEY };
  const pointLayout: Record<string, unknown> | undefined = themeColor
    ? undefined
    : { "circle-sort-key": AGE_SORT_KEY };

  return (
    <Source id={TILES_SOURCE_ID} type="vector" url={tilesUrl}>
      <Layer
        id={POLYGON_LAYER_ID}
        source-layer={TILES_SOURCE_LAYER}
        beforeId={BASEMAP_LABELS_ANCHOR}
        type="fill"
        filter={geometryFilter("Polygon", visibilityFilter)}
        paint={fillPaint}
      />
      <Layer
        id={POLYGON_STROKE_LAYER_ID}
        source-layer={TILES_SOURCE_LAYER}
        beforeId={BASEMAP_LABELS_ANCHOR}
        type="line"
        filter={geometryFilter("Polygon", visibilityFilter)}
        paint={strokePaint}
      />
      <Layer
        id={LINE_LAYER_ID}
        source-layer={TILES_SOURCE_LAYER}
        beforeId={BASEMAP_LABELS_ANCHOR}
        type="line"
        filter={geometryFilter("LineString", visibilityFilter)}
        paint={linePaint}
        {...(lineLayout && { layout: lineLayout })}
      />
      <Layer
        id={POINT_LAYER_ID}
        source-layer={TILES_SOURCE_LAYER}
        beforeId={BASEMAP_LABELS_ANCHOR}
        type="circle"
        filter={geometryFilter("Point", visibilityFilter)}
        paint={pointPaint}
        {...(pointLayout && { layout: pointLayout })}
      />
    </Source>
  );
}
