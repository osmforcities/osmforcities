import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

const SCHEME = "pmtiles://";
const protocol = new Protocol();
let registered = false;

/**
 * Register the pmtiles:// protocol with MapLibre exactly once, browser-only.
 * Vector sources then take url="pmtiles:///api/tiles/{jobId}.pmtiles" (the
 * relative path after the scheme is fetched against the page origin).
 */
export function ensurePmtilesProtocol(): void {
  if (registered || typeof window === "undefined") return;
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
}

export function openedArchive(source: object | undefined) {
  const url = source && "url" in source ? source.url : undefined;
  if (typeof url !== "string" || !url.startsWith(SCHEME)) return null;
  return protocol.get(url.slice(SCHEME.length)) ?? null;
}
