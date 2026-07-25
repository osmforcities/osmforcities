import { YML_LOCALE_MAP } from "@/lib/constants";
import { DEFAULT_LOCALE } from "@/i18n/constants";

// Keyed by OSM language subtag (en, es, pt, ...), plus a `default` key = the local `name` tag.
export type AreaNames = Record<string, string>;

// Accepts either Overpass relation tags or Nominatim namedetails — both key by name / name:<code>.
export function extractOsmNames(
  tags: Record<string, string> | undefined | null
): AreaNames {
  const names: AreaNames = {};
  if (!tags) return names;
  if (tags.name?.trim()) names.default = tags.name.trim();
  for (const [key, value] of Object.entries(tags)) {
    const match = key.match(/^name:(.+)$/);
    if (match && typeof value === "string" && value.trim()) {
      names[match[1]] = value.trim();
    }
  }
  return names;
}

/** Merge name maps; later arguments win on key conflicts. Empty result → {}. */
export function mergeAreaNames(
  ...maps: (AreaNames | undefined | null)[]
): AreaNames {
  return Object.assign({}, ...maps.map((m) => m ?? {}));
}

/** A merged map ready for a Prisma write: the map, or undefined when empty so the column is left unchanged. */
export function toStoredNames(map: AreaNames): AreaNames | undefined {
  return Object.keys(map).length > 0 ? map : undefined;
}

// pt-BR → ["pt-BR", "pt"] because OSM tags Portuguese as name:pt, not name:pt-BR.
export function localeToNameKeys(appLocale: string): string[] {
  const keys = [appLocale];
  const mapped = YML_LOCALE_MAP[appLocale];
  if (mapped && mapped !== appLocale) keys.push(mapped);
  return keys;
}

export function resolveAreaName(
  area: { name: string; names?: unknown },
  appLocale: string
): string {
  const names = (area.names ?? null) as AreaNames | null;
  if (names && typeof names === "object") {
    for (const key of localeToNameKeys(appLocale)) {
      if (names[key]) return names[key];
    }
    if (names[DEFAULT_LOCALE]) return names[DEFAULT_LOCALE];
    if (names.default) return names.default;
  }
  return area.name;
}

// Uses the denormalized `cityName` only as a last resort when the joined area has no name.
export function resolveDatasetAreaName(
  dataset: { cityName?: string | null; area: { name?: string | null; names?: unknown } },
  appLocale: string
): string {
  return resolveAreaName(
    { name: dataset.area.name ?? dataset.cityName ?? "", names: dataset.area.names },
    appLocale
  );
}
