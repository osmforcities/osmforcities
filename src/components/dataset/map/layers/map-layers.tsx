import { useMemo } from "react";
import type { Feature } from "geojson";
import { DetailedFeaturesLayerGroup } from ".";
import type { CategoricalTheme } from "@/lib/map-themes";

export type AgeCategoryValues<T> = {
  recent: T;
  medium: T;
  older: T;
  "very-old": T;
};

export type AgeCategoryColors = AgeCategoryValues<string>;

// Every tunable style value lives here so the dev style-tuning panel and the
// baked defaults share a single source of truth. The panel rebuilds
// expressions from an edited copy of these knobs and applies them live with
// setPaintProperty; tuned values get pasted back into DEFAULT_STYLE_KNOBS.
export type MapStyleKnobs = {
  // Exponential interpolation base; 1.5 approximates ground scaling (true
  // scale doubles per zoom, base 2 gets comically fat at z18)
  base: number;
  colors: AgeCategoryColors;
  point: {
    radiusZ10: number;
    radiusZ12: number;
    radiusZ15: number;
    radiusZ18: number;
    strokeZ15: number;
    opacity: number;
    strokeColor: string;
  };
  // Per-category radius boost added on top of the shared zoom curve. Recent
  // edits are a tiny minority; without emphasis they drown in the very-old
  // majority, so recent defaults to a positive boost.
  radiusBoost: AgeCategoryValues<number>;
  // Halo keeps a visible stroke on recent points even at low zoom where
  // other points have none
  recent: {
    haloWidth: number;
  };
  line: { widthZ8: number; widthZ13: number; widthZ18: number };
  polygonStroke: { widthZ8: number; widthZ13: number; widthZ18: number };
  boundary: { color: string; width: number; opacity: number };
};

export const DEFAULT_STYLE_KNOBS: MapStyleKnobs = {
  base: 1.5,
  // CARTO BluGrn sequential ramp, dark end = recent. Darkness is the only
  // channel that reliably carries at dot sizes and it is color-blind safe.
  // Chosen over the hand-built teal ramp because its higher-chroma light
  // end keeps the very-old majority distinguishable from the basemap
  colors: {
    recent: "#1d4f60",
    medium: "#36877a",
    older: "#6dbc90",
    "very-old": "#c4e6c3",
  },
  point: {
    radiusZ10: 3,
    radiusZ12: 3,
    radiusZ15: 5,
    radiusZ18: 6,
    strokeZ15: 2,
    // Full opacity: dots are tiny at low zoom, any transparency washes
    // them into the basemap
    opacity: 1,
    strokeColor: "#ffffff",
  },
  radiusBoost: {
    recent: 1,
    medium: 0,
    older: 0,
    "very-old": 0,
  },
  recent: {
    haloWidth: 1.5,
  },
  line: { widthZ8: 3.5, widthZ13: 2, widthZ18: 6 },
  polygonStroke: { widthZ8: 2.5, widthZ13: 1.5, widthZ18: 3 },
  // Administrative boundary: brand olive (design token olive-500) so it
  // reads as chrome, not data; the old #0b4ad8 blue collided with the
  // teal/blue-green data ramps
  boundary: { color: "#57814c", width: 2, opacity: 0.5 },
};

export const AGE_COLORS = DEFAULT_STYLE_KNOBS.colors;

// Candidate age palettes, switchable in the dev tuning panel. All keep the
// warm middle (orange/yellow) except the teal ramp, which trades the aging
// signal for a single color-blind-safe hue where darkness = recency
export const AGE_PALETTES: Record<string, AgeCategoryColors> = {
  // CARTO BluGrn (the baked default)
  "blu-grn": DEFAULT_STYLE_KNOBS.colors,
  // Hand-built single-hue teal, palest light end
  "teal-ramp": {
    recent: "#0f5c54",
    medium: "#2f9e8f",
    older: "#7fb8ad",
    "very-old": "#cbd5d1",
  },
  // ColorBrewer BuGn (blue-green, warmer light end)
  bugn: {
    recent: "#238b45",
    medium: "#66c2a4",
    older: "#b2e2e2",
    "very-old": "#e5f5f9",
  },
  // CARTO DarkMint (deeper, bluer dark end)
  "dark-mint": {
    recent: "#123f5a",
    medium: "#3a7c89",
    older: "#7bbcb0",
    "very-old": "#d2fbd4",
  },
};

export const AGE_STROKE_COLORS: AgeCategoryColors = {
  recent: "#143843",
  medium: "#266058",
  older: "#4f9770",
  "very-old": "#9fc49e",
};

export function buildAgeColorExpression(colors: AgeCategoryColors) {
  return [
    "case",
    ["==", ["get", "ageCategory"], "recent"],
    colors.recent,
    ["==", ["get", "ageCategory"], "medium"],
    colors.medium,
    ["==", ["get", "ageCategory"], "older"],
    colors.older,
    colors["very-old"],
  ];
}

// Draw order within a layer: recent on top of medium on top of the rest, so
// the few green features never hide under thousands of gray ones
export const AGE_SORT_KEY = [
  "case",
  ["==", ["get", "ageCategory"], "recent"],
  2,
  ["==", ["get", "ageCategory"], "medium"],
  1,
  0,
];

// Interpolate outputs may be per-feature expressions, which lets a single
// zoom curve carry per-category radius boosts. Only categories with a
// non-zero boost get a case branch, so the default (recent-only) keeps the
// expression small
function applyRadiusBoosts(
  value: number,
  boosts: AgeCategoryValues<number>
): number | unknown[] {
  const branches: unknown[] = [];
  for (const category of ["recent", "medium", "older"] as const) {
    if (boosts[category] !== 0) {
      branches.push(
        ["==", ["get", "ageCategory"], category],
        value + boosts[category]
      );
    }
  }
  const fallback = value + boosts["very-old"];
  if (branches.length === 0) return fallback;
  return ["case", ...branches, fallback];
}

export function buildPolygonStrokeWidth(knobs: MapStyleKnobs) {
  // Wider stroke at low zoom keeps small polygons visible once their fill
  // shrinks below a pixel; firms up again at street level
  return [
    "interpolate",
    ["exponential", knobs.base],
    ["zoom"],
    8,
    knobs.polygonStroke.widthZ8,
    13,
    knobs.polygonStroke.widthZ13,
    18,
    knobs.polygonStroke.widthZ18,
  ];
}

export function buildLineWidth(knobs: MapStyleKnobs) {
  // Wider lines at low zoom so short segments stay readable, growing toward
  // street level so lines feel attached to the ground, not painted on glass
  return [
    "interpolate",
    ["exponential", knobs.base],
    ["zoom"],
    8,
    knobs.line.widthZ8,
    13,
    knobs.line.widthZ13,
    18,
    knobs.line.widthZ18,
  ];
}

// Low-zoom radius scales with density: sparse points keep a touch more bulk
// on city-wide views, dense ones stay tiny so they don't blend into a blob.
// At high zoom individual features become the subject, so radius grows again
export function buildPointRadiusForCount(
  count: number,
  knobs: MapStyleKnobs = DEFAULT_STYLE_KNOBS
) {
  const densityFactor = count > 5000 ? 0.5 : count > 1500 ? 0.75 : 1;
  const boosts = knobs.radiusBoost;
  return [
    "interpolate",
    ["exponential", knobs.base],
    ["zoom"],
    10,
    applyRadiusBoosts(knobs.point.radiusZ10 * densityFactor, boosts),
    12,
    applyRadiusBoosts(knobs.point.radiusZ12 * densityFactor, boosts),
    15,
    applyRadiusBoosts(knobs.point.radiusZ15, boosts),
    18,
    applyRadiusBoosts(knobs.point.radiusZ18, boosts),
  ];
}

export function buildPointStrokeWidth(knobs: MapStyleKnobs) {
  // White border fades in with the growing radius so bare dots at city zoom
  // become outlined markers at street level; recent keeps a halo throughout
  const halo = knobs.recent.haloWidth;
  return [
    "interpolate",
    ["exponential", knobs.base],
    ["zoom"],
    12,
    halo > 0
      ? ["case", ["==", ["get", "ageCategory"], "recent"], halo, 0]
      : 0,
    15,
    halo > knobs.point.strokeZ15
      ? [
          "case",
          ["==", ["get", "ageCategory"], "recent"],
          halo,
          knobs.point.strokeZ15,
        ]
      : knobs.point.strokeZ15,
  ];
}

export function buildBoundaryStyle(knobs: MapStyleKnobs) {
  return {
    "line-color": knobs.boundary.color,
    "line-width": knobs.boundary.width,
    "line-dasharray": [3, 3],
    "line-opacity": knobs.boundary.opacity,
  };
}

export function buildPolygonStyle(knobs: MapStyleKnobs) {
  return {
    fill: {
      "fill-color": buildAgeColorExpression(knobs.colors),
      "fill-opacity": 0.7,
    },
    stroke: {
      "line-color": buildAgeColorExpression(AGE_STROKE_COLORS),
      "line-width": buildPolygonStrokeWidth(knobs),
      "line-opacity": 0.9,
    },
  };
}

export function buildLineStyle(knobs: MapStyleKnobs) {
  return {
    "line-color": buildAgeColorExpression(knobs.colors),
    "line-width": buildLineWidth(knobs),
    "line-opacity": 0.9,
  };
}

export function buildPointStyle(knobs: MapStyleKnobs) {
  return {
    "circle-radius": 2,
    "circle-color": buildAgeColorExpression(knobs.colors),
    "circle-opacity": knobs.point.opacity,
    "circle-stroke-width": buildPointStrokeWidth(knobs),
    "circle-stroke-color": knobs.point.strokeColor,
  };
}

export const BOUNDARY_STYLE = buildBoundaryStyle(DEFAULT_STYLE_KNOBS);
export const POLYGON_STYLE = buildPolygonStyle(DEFAULT_STYLE_KNOBS);
export const LINE_STYLE = buildLineStyle(DEFAULT_STYLE_KNOBS);
export const POINT_STYLE = buildPointStyle(DEFAULT_STYLE_KNOBS);

type MapLayersProps = {
  geoJSONData: {
    features: Feature[];
  };
  categoricalTheme: CategoricalTheme | null;
};

export function MapLayers({ geoJSONData, categoricalTheme }: MapLayersProps) {
  // Stable array identities so downstream geometry work (proxy centroids)
  // only recomputes when the data actually changes
  const { polygonFeatures, lineFeatures, pointFeatures } = useMemo(
    () => ({
      polygonFeatures: geoJSONData.features.filter(
        (f: Feature) =>
          f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
      ),
      lineFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "LineString"
      ),
      pointFeatures: geoJSONData.features.filter(
        (f: Feature) => f.geometry.type === "Point"
      ),
    }),
    [geoJSONData.features]
  );

  return (
    <DetailedFeaturesLayerGroup
      polygonFeatures={polygonFeatures}
      lineFeatures={lineFeatures}
      pointFeatures={pointFeatures}
      categoricalTheme={categoricalTheme}
    />
  );
}
