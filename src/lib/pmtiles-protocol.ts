import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

let registered = false;

/**
 * Register the pmtiles:// protocol with MapLibre exactly once, browser-only.
 * Vector sources then take url="pmtiles:///api/tiles/{jobId}.pmtiles" (the
 * relative path after the scheme is fetched against the page origin).
 */
export function ensurePmtilesProtocol(): void {
  if (registered || typeof window === "undefined") return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  registered = true;
}
