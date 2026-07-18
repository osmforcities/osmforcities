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
  // Translucent white wash over the raster basemap so data layers stay the
  // most saturated thing on screen (ciclomapa-style figure/ground)
  basemapWashOpacity: number;
  colors: AgeCategoryColors;
  point: {
    radiusZ12: number;
    radiusZ15: number;
    radiusZ18: number;
    // Low-zoom white hairline; separates same-color dots in dense clusters
    // that otherwise fuse into a stain
    strokeZ12: number;
    strokeZ15: number;
    // Per-age-category circle opacity; fading the very-old majority is
    // another lever besides color to make recent edits pop
    opacity: AgeCategoryValues<number>;
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
  basemapWashOpacity: 0.4,
  // Viridis picks, dark end = recent. Multi-hue and colorblind safe; every
  // step keeps full chroma so no category washes into the muted basemap.
  // Chosen over single-hue ramps (BluGrn/teal) whose pale light end made
  // the very-old majority near-invisible
  colors: {
    recent: "#414487",
    medium: "#2a788e",
    older: "#22a884",
    "very-old": "#7ad151",
  },
  point: {
    radiusZ12: 3.5,
    radiusZ15: 5,
    radiusZ18: 6,
    strokeZ12: 1,
    strokeZ15: 2,
    // Full opacity: dots are tiny at low zoom, any transparency washes
    // them into the basemap
    opacity: { recent: 1, medium: 1, older: 1, "very-old": 1 },
    strokeColor: "#ffffff",
  },
  // Graduated boosts: newer categories are progressively larger, so size
  // reinforces the color ramp
  radiusBoost: {
    recent: 2,
    medium: 1.5,
    older: 1,
    "very-old": 0.5,
  },
  recent: {
    haloWidth: 1.5,
  },
  line: { widthZ8: 3.5, widthZ13: 2, widthZ18: 6 },
  polygonStroke: { widthZ8: 2.5, widthZ13: 1.5, widthZ18: 3 },
  // Administrative boundary: brand olive (design token olive-500) so it
  // reads as chrome, not data; the old #0b4ad8 blue collided with the
  // teal/blue-green data ramps
  boundary: { color: "#57814c", width: 2, opacity: 0.7 },
};

export const AGE_COLORS = DEFAULT_STYLE_KNOBS.colors;

// Darker steps of the viridis ramp for polygon outlines
export const AGE_STROKE_COLORS: AgeCategoryColors = {
  recent: "#2e3060",
  medium: "#1d5464",
  older: "#17755c",
  "very-old": "#559239",
};

// The one mapping from per-age values to a MapLibre case expression.
// Collapses to the bare value when everything matches and skips branches
// equal to the fallback, so the common uniform cases cost nothing
export function ageCase<T>(values: AgeCategoryValues<T>): T | unknown[] {
  const fallback = values["very-old"];
  const branches: unknown[] = [];
  for (const category of ["recent", "medium", "older"] as const) {
    if (values[category] !== fallback) {
      branches.push(["==", ["get", "ageCategory"], category], values[category]);
    }
  }
  if (branches.length === 0) return fallback;
  return ["case", ...branches, fallback];
}

// Draw order within a layer: strictly newer above older, so recent never
// hides under the very-old majority and very-old never covers older
export const AGE_SORT_KEY = ageCase({
  recent: 3,
  medium: 2,
  older: 1,
  "very-old": 0,
}) as unknown[];

// Interpolate outputs may be per-feature expressions, which lets a single
// zoom curve carry per-category radius boosts
function applyRadiusBoosts(value: number, boosts: AgeCategoryValues<number>) {
  return ageCase({
    recent: value + boosts.recent,
    medium: value + boosts.medium,
    older: value + boosts.older,
    "very-old": value + boosts["very-old"],
  });
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

// City-zoom radius scales with density: sparse points keep a touch more bulk
// on city-wide views, dense ones stay tiny so they don't blend into a blob.
// At high zoom individual features become the subject, so radius grows again.
// The curve starts at z12 (the default view); below it MapLibre clamps to
// the z12 value, keeping far-out dots small
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
  const withHalo = (stroke: number) =>
    ageCase({
      recent: Math.max(halo, stroke),
      medium: stroke,
      older: stroke,
      "very-old": stroke,
    });
  return [
    "interpolate",
    ["exponential", knobs.base],
    ["zoom"],
    12,
    withHalo(knobs.point.strokeZ12),
    15,
    withHalo(knobs.point.strokeZ15),
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
      "fill-color": ageCase(knobs.colors),
      "fill-opacity": 0.7,
    },
    stroke: {
      "line-color": ageCase(AGE_STROKE_COLORS),
      "line-width": buildPolygonStrokeWidth(knobs),
      "line-opacity": 0.9,
    },
  };
}

export function buildLineStyle(knobs: MapStyleKnobs) {
  return {
    "line-color": ageCase(knobs.colors),
    "line-width": buildLineWidth(knobs),
    "line-opacity": 0.9,
  };
}

export function buildPointStyle(knobs: MapStyleKnobs) {
  return {
    "circle-radius": 2,
    "circle-color": ageCase(knobs.colors),
    "circle-opacity": ageCase(knobs.point.opacity),
    "circle-stroke-width": buildPointStrokeWidth(knobs),
    "circle-stroke-color": knobs.point.strokeColor,
  };
}

export const BOUNDARY_STYLE = buildBoundaryStyle(DEFAULT_STYLE_KNOBS);
export const POLYGON_STYLE = buildPolygonStyle(DEFAULT_STYLE_KNOBS);
export const LINE_STYLE = buildLineStyle(DEFAULT_STYLE_KNOBS);
export const POINT_STYLE = buildPointStyle(DEFAULT_STYLE_KNOBS);
