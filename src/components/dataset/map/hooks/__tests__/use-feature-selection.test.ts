import { describe, it, expect, vi } from "vitest";
import type { Feature, Point } from "geojson";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { selectFromTiles, toSelectedFeature } from "../use-feature-selection";
import { POINT_LAYER_ID } from "../../layers/layer-ids";

const stop: Point = { type: "Point", coordinates: [-47.9, -15.79] };

// MapLibre's tile hits decode geometry in a prototype getter, so it is not an
// own property: a spread copy drops it.
class LazyTileHit {
  type = "Feature" as const;
  layer = { id: POINT_LAYER_ID };
  constructor(public properties: Record<string, unknown>) {}
  get geometry() {
    return stop;
  }
}

describe("toSelectedFeature", () => {
  it("keeps the geometry of a tile hit and maps @id to id", () => {
    const hit = new LazyTileHit({
      "@id": "node/1",
      highway: "bus_stop",
    }) as unknown as MapGeoJSONFeature;

    const feature = toSelectedFeature(hit);

    expect(feature.geometry).toEqual(stop);
    expect(feature.properties).toEqual({
      "@id": "node/1",
      id: "node/1",
      highway: "bus_stop",
    });
  });

  it("returns a hit that already has an id unchanged", () => {
    const hit = {
      type: "Feature",
      geometry: stop,
      properties: { id: "node/1", highway: "bus_stop" },
      layer: { id: POINT_LAYER_ID },
    } as unknown as MapGeoJSONFeature;

    expect(toSelectedFeature(hit)).toBe(hit);
  });
});

describe("selectFromTiles", () => {
  const drawn: Feature = {
    type: "Feature",
    geometry: stop,
    properties: { id: "node/1", "@id": "node/1", highway: "bus_stop" },
  };
  const full: Feature = {
    ...drawn,
    properties: { ...drawn.properties, name: "Central" },
  };

  it("selects as loading, then with the full tags", async () => {
    const select = vi.fn();

    await selectFromTiles(drawn, async () => full, select, () => true);

    expect(select.mock.calls).toEqual([
      [drawn, "loading"],
      [full, "full"],
    ]);
  });

  it("falls back to the drawn tags when the tile lacks the feature", async () => {
    const select = vi.fn();

    await selectFromTiles(drawn, async () => null, select, () => true);

    expect(select).toHaveBeenLastCalledWith(drawn, "drawn");
  });

  it("drops the read when a newer click or a deselect came first", async () => {
    const select = vi.fn();

    await selectFromTiles(drawn, async () => full, select, () => false);

    expect(select.mock.calls).toEqual([[drawn, "loading"]]);
  });
});
