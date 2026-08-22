import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import type { MapGeoJSONFeature } from "maplibre-gl";
import {
  createSmallPolygonProxyPoints,
  resolveProxyFeature,
} from "../polygon-proxy-points";
import { INTERACTIVE_LAYER_IDS, PROXY_LAYER_ID } from "../layer-ids";

const pool: Feature = {
  type: "Feature",
  properties: { id: "way/123", leisure: "swimming_pool" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-47.9, -15.79],
        [-47.8999, -15.79],
        [-47.8999, -15.7899],
        [-47.9, -15.7899],
        [-47.9, -15.79],
      ],
    ],
  },
};

const asHit = (feature: Feature, layerId: string) =>
  ({ ...feature, layer: { id: layerId } }) as unknown as MapGeoJSONFeature;

describe("INTERACTIVE_LAYER_IDS", () => {
  // Drop the proxy layer and every low-zoom click hits nothing (#468)
  it("keeps the low-zoom proxy circles clickable", () => {
    expect(INTERACTIVE_LAYER_IDS).toContain(PROXY_LAYER_ID);
  });
});

describe("resolveProxyFeature", () => {
  const [proxy] = createSmallPolygonProxyPoints([pool]);
  const hit = asHit(proxy, PROXY_LAYER_ID);

  it("swaps a proxy-circle hit for the polygon it stands for", () => {
    expect(proxy.geometry.type).toBe("Point");
    expect(resolveProxyFeature(hit, [pool])).toBe(pool);
  });

  it("leaves a hit on a real layer alone", () => {
    const direct = asHit(pool, "detailed-polygons");
    expect(resolveProxyFeature(direct, [pool])).toBe(direct);
  });

  it("falls back to the proxy when the source polygon is gone", () => {
    expect(resolveProxyFeature(hit, [])).toBe(hit);
  });

  it("does not match id-less polygons against each other", () => {
    const anonymous: Feature = { ...pool, properties: { leisure: "pool" } };
    const [anonymousProxy] = createSmallPolygonProxyPoints([anonymous]);
    const anonymousHit = asHit(anonymousProxy, PROXY_LAYER_ID);
    expect(resolveProxyFeature(anonymousHit, [pool, anonymous])).toBe(
      anonymousHit
    );
  });
});
