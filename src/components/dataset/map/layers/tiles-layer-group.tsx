import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { FilterSpecification } from "maplibre-gl";
import { AGE_SORT_KEY } from "./map-style";
import {
  buildThemePointPaint,
  buildThemePolygonFillPaint,
  buildThemePolygonStrokePaint,
  buildThemeLinePaint,
} from "./detailed-features-layer-group";
import {
  POLYGON_LAYER_ID,
  POLYGON_STROKE_LAYER_ID,
  LINE_LAYER_ID,
  POINT_LAYER_ID,
} from "./layer-ids";
import type { CuratedTheme } from "@/lib/curated-themes";
import { buildCuratedColorExpression } from "@/lib/curated-themes";

const TILES_SOURCE_ID = "dataset-tiles";
// The tiler bakes everything into one layer named "features" (see API.md).
const SOURCE_LAYER = "features";

// ["geometry-type"] folds Multi* into the base type, so three filters cover
// every feature. The JS geometry split of the geojson path becomes layer
// filters here — that is the whole difference between the two groups.
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
  /** Stored feature count — sizes the default point radius. */
  dataCount: number;
  curatedTheme: CuratedTheme | null;
  visibilityFilter?: FilterSpecification;
};

/**
 * Vector-source twin of DetailedFeaturesLayerGroup: same layer ids (selection
 * and highlight code is shared), same paint builders (all property-driven, so
 * they run unchanged against the tile source). No polygon-proxy layer —
 * tippecanoe's own low-zoom simplification covers small polygons.
 */
export function TilesLayerGroup({
  tilesUrl,
  dataCount,
  curatedTheme,
  visibilityFilter,
}: TilesLayerGroupProps) {
  const themeColor = useMemo(
    () => (curatedTheme ? buildCuratedColorExpression(curatedTheme) : null),
    [curatedTheme]
  );

  // Same loose paint typing as MapLayer: the builders emit expression arrays
  // that MapLibre's strict literal types reject at compile time.
  const fillPaint: Record<string, unknown> = buildThemePolygonFillPaint(themeColor);
  const strokePaint: Record<string, unknown> =
    buildThemePolygonStrokePaint(themeColor);
  const linePaint: Record<string, unknown> = buildThemeLinePaint(themeColor);
  const pointPaint: Record<string, unknown> = buildThemePointPaint(
    themeColor,
    dataCount
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
        source-layer={SOURCE_LAYER}
        type="fill"
        filter={geometryFilter("Polygon", visibilityFilter)}
        paint={fillPaint}
      />
      <Layer
        id={POLYGON_STROKE_LAYER_ID}
        source-layer={SOURCE_LAYER}
        type="line"
        filter={geometryFilter("Polygon", visibilityFilter)}
        paint={strokePaint}
      />
      <Layer
        id={LINE_LAYER_ID}
        source-layer={SOURCE_LAYER}
        type="line"
        filter={geometryFilter("LineString", visibilityFilter)}
        paint={linePaint}
        {...(lineLayout && { layout: lineLayout })}
      />
      <Layer
        id={POINT_LAYER_ID}
        source-layer={SOURCE_LAYER}
        type="circle"
        filter={geometryFilter("Point", visibilityFilter)}
        paint={pointPaint}
        {...(pointLayout && { layout: pointLayout })}
      />
    </Source>
  );
}
