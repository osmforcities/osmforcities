import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { TILES_ENABLED } from "@/lib/dataset-tiles";

let registered = false;

/**
 * Register the pmtiles:// protocol with MapLibre exactly once, browser-only.
 * Vector sources then take url="pmtiles:///api/tiles/{jobId}.pmtiles" (the
 * relative path after the scheme is fetched against the page origin).
 * Gated on the kill switch so the flag-off path never touches the protocol.
 */
export function ensurePmtilesProtocol(): void {
  if (!TILES_ENABLED || registered || typeof window === "undefined") return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  registered = true;
}
