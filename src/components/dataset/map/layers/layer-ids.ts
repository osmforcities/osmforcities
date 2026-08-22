export const POLYGON_LAYER_ID = "detailed-polygons";
export const POLYGON_STROKE_LAYER_ID = "detailed-polygons-stroke";
export const LINE_LAYER_ID = "detailed-lines";
export const POINT_LAYER_ID = "detailed-points";
export const PROXY_LAYER_ID = "polygon-proxy-points";

// Proxy circles belong here: below ~z14 they are the only visible mark for a
// small polygon, whose footprint is subpixel and so never under the cursor.
export const INTERACTIVE_LAYER_IDS = [
  POLYGON_LAYER_ID,
  LINE_LAYER_ID,
  POINT_LAYER_ID,
  PROXY_LAYER_ID,
];
