import type { Area } from "@/types/area";
import type { NominatimResult } from "@/schemas/nominatim";
import type { OSMRelation } from "@/types/osm";
import { extractOsmNames } from "@/lib/area-name";

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

function parseCenter(lat: string, lon: string): { centerLat?: number; centerLon?: number } {
  const centerLat = parseFloat(lat);
  const centerLon = parseFloat(lon);

  if (
    isNaN(centerLat) ||
    isNaN(centerLon) ||
    centerLat < -90 ||
    centerLat > 90 ||
    centerLon < -180 ||
    centerLon > 180
  ) {
    return {};
  }

  return { centerLat, centerLon };
}

export function parsePopulation(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  const population = Number(trimmed);
  return population > 0 ? population : undefined;
}

function trimmedIfMatches(value: string | undefined, pattern: RegExp): string | undefined {
  const trimmed = value?.trim();
  return trimmed && pattern.test(trimmed) ? trimmed : undefined;
}

function parseAreaFacts(tags: Record<string, string> = {}) {
  const population = parsePopulation(tags.population);
  const populationDate = trimmedIfMatches(tags["population:date"], /^\d{4}(-\d{2}){0,2}$/);
  const elevation = trimmedIfMatches(tags.ele, /^-?\d+(\.\d+)?$/);
  return {
    population,
    populationYear: population === undefined ? undefined : populationDate?.slice(0, 4),
    elevation: elevation === undefined ? undefined : Number(elevation),
    // capital=<n> names the admin level it is the capital of; 2 is the country
    isCapital: tags.capital === "yes" || tags.capital === "2",
    wikipedia: trimmedIfMatches(tags.wikipedia, /^[a-z][a-z-]*:\S/),
    wikidata: trimmedIfMatches(tags.wikidata, /^Q\d+$/),
    website: parseWebsite(tags.website),
    flag: parseCommonsFile(tags.flag),
  };
}

function parseUrl(value: string | undefined): URL | undefined {
  if (!value || !URL.canParse(value.trim())) return undefined;
  return new URL(value.trim());
}

function parseWebsite(value: string | undefined): string | undefined {
  const url = parseUrl(value);
  return url && ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
}

/** OSM writes image tags as `File:<name>` or as a Commons upload URL; anything else could be any host. */
function parseCommonsFile(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (trimmed?.startsWith("File:")) return trimmed.slice("File:".length) || undefined;
  const url = parseUrl(trimmed);
  if (url?.hostname !== "upload.wikimedia.org" || !url.pathname.startsWith("/wikipedia/commons/")) {
    return undefined;
  }
  try {
    return decodeURIComponent(url.pathname.split("/").at(-1) ?? "") || undefined;
  } catch {
    return undefined;
  }
}

export function commonsImageUrl(file: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

/** `wikipedia` is the OSM tag, `<lang>:<title>[#<section>]`. */
export function wikipediaUrl(wikipedia: string): string {
  const separator = wikipedia.indexOf(":");
  const lang = wikipedia.slice(0, separator);
  const [title, section] = wikipedia
    .slice(separator + 1)
    .replaceAll(" ", "_")
    .split("#", 2)
    .map(encodeURIComponent);
  return `https://${lang}.wikipedia.org/wiki/${title}${section ? `#${section}` : ""}`;
}

export function fromNominatim(result: NominatimResult): Area {
  validateId(result.osm_id);

  const bbox = normalizeBoundingBox(result.boundingbox);
  validateBBox(bbox);

  return {
    ...parseCenter(result.lat, result.lon),
    id: result.osm_id,
    name: result.name?.trim() || result.display_name?.split(",")[0].trim() || "",
    names: extractOsmNames(result.namedetails ?? undefined),
    displayName: result.display_name?.trim() || "",
    osmType: result.osm_type,
    class: result.class,
    type: result.type,
    addresstype: result.addresstype,
    boundingBox: bbox,
    countryCode: result.address?.country_code?.toLowerCase().trim(),
    country: result.address?.country?.trim(),
    state: result.address?.state?.trim(),
    ...parseAreaFacts(result.extratags ?? undefined),
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
export function fromOverpass(
  relation: OSMRelation,
  tags: Record<string, string> | undefined,
  bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number }
): Area {
  validateId(relation.id);
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
