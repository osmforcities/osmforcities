import { fromNominatim } from "@/lib/area-conversion";
import type { NominatimResult } from "@/schemas/nominatim";
import type { Area } from "@/types/area";

/** An area as shown in the search dropdown, with context to tell look-alikes apart. */
export type AreaSearchResult = Area & {
  /** Parent names (state, country), excluding the component that is the area itself. */
  parents: string[];
  /** OSM population tag, when present and a plain integer. */
  population: number | null;
};

function adminLevel(result: NominatimResult): number {
  const level = Number(result.extratags?.admin_level);
  return Number.isFinite(level) ? level : -Infinity;
}

/**
 * OSM can model one place as several nested boundaries: Paris is a commune
 * and a département sharing wikidata Q90; a Brazilian municipality often has
 * a seat district with its exact outline and no wikidata. Nominatim's own
 * dedupe keeps them apart. Treat them as one place when they share wikidata,
 * or share name and bounding box.
 */
function isSamePlace(a: NominatimResult, b: NominatimResult): boolean {
  const wikidata = a.extratags?.wikidata;
  if (wikidata && wikidata === b.extratags?.wikidata) return true;
  return a.name === b.name && a.boundingbox.join() === b.boundingbox.join();
}

// The municipality outranks its seat district on importance. When importance
// is tied (Paris) Nominatim's order is not stable, so fall back to the most
// local admin level.
function isBetter(candidate: NominatimResult, kept: NominatimResult): boolean {
  const diff = (candidate.importance ?? 0) - (kept.importance ?? 0);
  if (Math.abs(diff) > 1e-9) return diff > 0;
  return adminLevel(candidate) > adminLevel(kept);
}

/**
 * Collapse results that are the same place, keeping the group's first
 * position. Matching is transitive: a district can match the commune by
 * outline while the département matches it by wikidata, so a new result can
 * join several groups into one.
 */
export function dedupeAreas(results: NominatimResult[]): NominatimResult[] {
  const groups: NominatimResult[][] = [];
  for (const result of results) {
    const matching = groups.filter((group) =>
      group.some((member) => isSamePlace(member, result))
    );
    if (matching.length === 0) {
      groups.push([result]);
      continue;
    }
    // Merge into the earliest group; members stay in arrival order.
    const [first, ...rest] = matching;
    for (const group of rest) {
      first.push(...group);
      groups.splice(groups.indexOf(group), 1);
    }
    first.push(result);
    first.sort((a, b) => results.indexOf(a) - results.indexOf(b));
  }
  return groups.map((group) =>
    group.reduce((kept, candidate) =>
      isBetter(candidate, kept) ? candidate : kept
    )
  );
}

// Nominatim place_rank is normalized across countries, unlike admin_level
// (Greater London and New York City are 5, Tokyo Metropolis is 4).
// 0 = city and below, 1 = state/region, 2 = country.
function scale(result: NominatimResult): number {
  const rank = result.place_rank;
  if (rank === undefined || rank >= 10) return 0;
  return rank > 4 ? 1 : 2;
}

/**
 * Cities first, then states, then countries, keeping Nominatim's order within
 * each scale. A strict local-first sort would put City of London above
 * Greater London, which is what people mean by London.
 */
export function rankByScale(results: NominatimResult[]): NominatimResult[] {
  return [...results].sort((a, b) => scale(a) - scale(b));
}

export function parsePopulation(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const population = Number(trimmed);
  return population > 0 ? population : null;
}

export function toAreaSearchResult(result: NominatimResult): AreaSearchResult {
  const area = fromNominatim(result);
  // Skip the address component that is the result itself (a state's own
  // `state`), but keep a same-named parent: São Paulo city sits in São Paulo
  // state, and that parent is what tells the two rows apart.
  const parents = (["state", "country"] as const)
    .filter((key) => key !== result.addresstype)
    .map((key) => result.address?.[key]?.trim())
    .filter((name): name is string => !!name);

  // Nominatim links the place=city node to one boundary only; a same-named
  // boundary it did not link (the Paris commune) gets demoted to "suburb".
  const addresstype =
    result.address?.city === area.name ? "city" : area.addresstype;

  return {
    ...area,
    addresstype,
    parents,
    population: parsePopulation(result.extratags?.population),
  };
}
