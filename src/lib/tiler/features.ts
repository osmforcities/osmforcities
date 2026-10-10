import type { Feature, FeatureCollection } from "geojson";

// The tiler's @-prefixed meta keys, onto the flat keys osmtogeojson's
// flatProperties gives the app's snapshot
const META_KEYS: Record<string, string> = {
  "@id": "id",
  "@user": "user",
  "@uid": "uid",
  "@timestamp": "timestamp",
  "@version": "version",
  "@changeset": "changeset",
};

// Needs a keepMeta bake: without it features carry no user or timestamp
export function ndjsonToFeatureCollection(ndjson: string): FeatureCollection {
  const features = ndjson
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const feature = JSON.parse(line) as Feature;
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(feature.properties ?? {})) {
        // The map stamps its own _ts at render time
        if (key !== "_ts") properties[META_KEYS[key] ?? key] = value;
      }
      // App features carry the id at both levels
      return { ...feature, id: properties.id as string, properties };
    });
  return { type: "FeatureCollection", features };
}
