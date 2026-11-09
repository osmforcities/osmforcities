import { describe, it, expect } from "vitest";
import {
  mapStyle,
  BASEMAP_LABELS_ANCHOR,
  BASEMAP_WASH_LAYER_ID,
} from "../map-tiles";

const layerIds = mapStyle.layers.map((l) => l.id);
const anchorIndex = layerIds.indexOf(BASEMAP_LABELS_ANCHOR);
const washIndex = layerIds.indexOf(BASEMAP_WASH_LAYER_ID);

describe("basemap style", () => {
  it("anchors on the first label layer", () => {
    expect(anchorIndex).toBeGreaterThan(-1);
    expect(mapStyle.layers[anchorIndex].type).toBe("symbol");
    expect(
      mapStyle.layers.slice(0, anchorIndex).some((l) => l.type === "symbol")
    ).toBe(false);
  });

  it("puts the wash right below the labels", () => {
    expect(washIndex).toBe(anchorIndex - 1);
  });

  it("serves vector tiles, not raster", () => {
    expect(mapStyle.sources.openmaptiles).toMatchObject({ type: "vector" });
    expect(mapStyle.glyphs).toBeTruthy();
  });
});
