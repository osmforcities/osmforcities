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
  });

  it("puts the wash right below the labels", () => {
    expect(washIndex).toBe(anchorIndex - 1);
  });

  it("keeps the openmaptiles vector source after a re-vendor", () => {
    expect(mapStyle.sources.openmaptiles).toMatchObject({ type: "vector" });
  });

  it("loads every basemap resource from the same-site edge proxy", () => {
    expect({
      vector: mapStyle.sources.openmaptiles,
      raster: mapStyle.sources.ne2_shaded,
      sprite: mapStyle.sprite,
      glyphs: mapStyle.glyphs,
    }).toMatchObject({
      vector: { url: "https://osmforcities.org/basemap/planet" },
      raster: {
        tiles: ["https://osmforcities.org/basemap/natural_earth/ne2sr/{z}/{x}/{y}.png"],
      },
      sprite: "https://osmforcities.org/basemap/sprites/ofm_f384/ofm",
      glyphs: "https://osmforcities.org/basemap/fonts/{fontstack}/{range}.pbf",
    });
  });
});
