import { describe, it, expect } from "vitest";
import { mapStyle, BASEMAP_LABELS_ANCHOR } from "../map-tiles";
import { DEFAULT_STYLE_KNOBS } from "@/components/dataset/map/layers/map-style";

const layerIds = mapStyle.layers.map((l) => l.id);
const anchorIndex = layerIds.indexOf(BASEMAP_LABELS_ANCHOR);
const washIndex = layerIds.indexOf("basemap-mute");

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

  it("carries the tuned wash opacity", () => {
    const wash = mapStyle.layers[washIndex];
    if (wash.type !== "background") throw new Error("wash is not a background");
    expect(wash.paint?.["background-opacity"]).toBe(
      DEFAULT_STYLE_KNOBS.basemapWashOpacity
    );
  });

  it("serves vector tiles, not raster", () => {
    expect(mapStyle.sources.openmaptiles).toMatchObject({ type: "vector" });
    expect(mapStyle.glyphs).toBeTruthy();
  });
});
