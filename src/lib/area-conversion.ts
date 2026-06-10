import type { Area } from "@/types/area";
import type { NominatimResult } from "@/schemas/nominatim";
import type { OSMRelation } from "@/types/osm";

export class InvalidAreaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAreaError";
  }
}

function validateId(id: number): void {
  // Guard against NaN (undefined/null after numeric conversion)
  if (isNaN(id) || id <= 0) {
    throw new InvalidAreaError(`Invalid area id: ${id}. Must be positive.`);
  }
}

function validateBBox(bbox: number[]): void {
  if (bbox.length !== 4) {
    throw new InvalidAreaError(`Invalid bounding box: expected 4 values, got ${bbox.length}`);
  }

  const [minLat, minLon, maxLat, maxLon] = bbox;

  // Check for NaN values (parseFloat failed)
  if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) {
    throw new InvalidAreaError(`Invalid bounding box: coordinates must be numeric`);
  }

  // Validate latitude: -90 to 90
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    throw new InvalidAreaError(`Invalid bounding box: latitude must be between -90 and 90`);
  }

  // Validate longitude: -180 to 180
  if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
    throw new InvalidAreaError(`Invalid bounding box: longitude must be between -180 and 180`);
  }
}

function normalizeBoundingBox(nominatimBbox: string[]): [number, number, number, number] {
  if (nominatimBbox.length !== 4) {
    throw new InvalidAreaError(`Invalid bounding box: expected 4 values, got ${nominatimBbox.length}`);
  }

  // Nominatim bbox: [minLat, maxLat, minLon, maxLon]
  // We want: [minLat, minLon, maxLat, maxLon]
  const minLat = parseFloat(nominatimBbox[0]);
  const maxLat = parseFloat(nominatimBbox[1]);
  const minLon = parseFloat(nominatimBbox[2]);
  const maxLon = parseFloat(nominatimBbox[3]);

  return [minLat, minLon, maxLat, maxLon];
}

function normalizeBoundsToBbox(bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number }): [number, number, number, number] {
  // Overpass bounds: { minlat, minlon, maxlat, maxlon }
  // We want: [minLat, minLon, maxLat, maxLon]
  return [bounds.minlat, bounds.minlon, bounds.maxlat, bounds.maxlon];
}

export function fromNominatim(result: NominatimResult): Area {
  validateId(result.osm_id);

  const bbox = normalizeBoundingBox(result.boundingbox);
  validateBBox(bbox);

  return {
    id: result.osm_id,
    name: result.name?.trim() || result.display_name?.split(",")[0].trim() || "",
    displayName: result.display_name?.trim() || "",
    osmType: result.osm_type,
    class: result.class,
    type: result.type,
    addresstype: result.addresstype,
    boundingBox: bbox,
    countryCode: result.address?.country_code?.toLowerCase().trim(),
    country: result.address?.country?.trim(),
    state: result.address?.state?.trim(),
  };
}

/**
 * Convert Overpass relation to Area
 * @param relation - OSM relation from Overpass API
 * @param tags - Relation tags (optional, for name/class/type extraction)
 * @param bounds - Geographic bounds { minlat, minlon, maxlat, maxlon }
 * @returns Area - Converted area object
 *
 * Note: Currently unused in production but preserved for:
 * - Future Overpass API integration (area queries, bbox-based searches)
 * - Consistency with Nominatim conversion path
 * - Test coverage ensures implementation stays valid
 */
export function fromOverpass(relation: OSMRelation, tags: Record<string, string> | undefined, bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }): Area {
  validateId(relation.id);

  if (!bounds) {
    throw new InvalidAreaError("Bounds are required for Overpass conversion");
  }

  const bbox = normalizeBoundsToBbox(bounds);
  validateBBox(bbox);

  const safeTags = tags || {};
  const name = safeTags.name?.trim() || "";

  return {
    id: relation.id,
    name: name,
    displayName: name, // Overpass doesn't have display_name, use name
    osmType: relation.type,
    class: safeTags.type || "",
    type: safeTags.boundary || "",
    boundingBox: bbox,
  };
}
