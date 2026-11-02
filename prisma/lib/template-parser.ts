/**
 * Shared template parsing utilities for seed scripts and icon generation.
 *
 * Loads templates from templates.yml (logic only). Translations are read by seed from templates.i18n.yml.
 */

import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { join } from "path";

const DEFAULT_PRISMA = "./prisma";
const LOGIC_FILE = "templates.yml";
const I18N_FILE = "templates.i18n.yml";

export interface LogicEntry {
  id: string;
  query: string;
  category: string;
  icon?: string;
  parent?: string;
  filterableTags?: string[];
}

/**
 * Logic-only template value (no i18n)
 */
export interface TemplateLogic {
  query: string;
  category: string;
  icon?: string;
  parent?: string;
  filterableTags?: string[];
}

/**
 * A curated demonstrator city for a template: an OSM relation id whose data
 * shows the template at its best. Validated only, never written to the DB.
 */
export interface Demonstrator {
  area: number;
  note?: string;
}

/**
 * One node of the category tree. A category without a parent is a topic.
 */
export interface ParsedCategory {
  slug: string;
  icon: string;
  parent?: string;
}

/**
 * Logic-only config from templates.yml (used by parseTemplates and collectIcons)
 */
export interface LogicConfig {
  templates: Record<string, TemplateLogic>;
  // Raw so validateCategories can report shape errors on hand-edited YAML
  categories?: unknown;
  // Raw so validateDemonstrators can report shape errors on hand-edited YAML
  // (incl. a scalar/array root, not just per-key issues).
  demonstrators?: unknown;
  // Raw for the same reason, see validateReplacedBy
  replacedBy?: unknown;
  commonTemplates?: unknown;
}

/**
 * I18n data from templates.i18n.yml (used only by seed)
 */
export interface TemplatesI18n {
  name: Record<string, string>;
  desc: Record<string, string>;
}

export interface I18nConfig {
  templates: Record<string, TemplatesI18n>;
}

/**
 * Parsed template configuration (internal)
 */
export interface TemplateConfig {
  id: string;
  kv: string;
  category: string;
  icon?: string;
  parent?: string;
  name?: string;
  description?: string;
  filterableTags?: string[];
}

/**
 * Fully built template with all computed fields
 */
export interface ParsedTemplate {
  id: string;
  name: string;
  description: string;
  overpassQuery: string;
  category: string;
  tags: string[];
  filterableTags: string[];
  parent?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  index?: number;
}

/**
 * Result of template parsing with optional errors
 */
export interface ParseResult {
  templates: ParsedTemplate[];
  categories: ParsedCategory[];
  errors: ValidationError[];
  warnings: string[];
  /** Empty when the section has errors */
  replacedBy: Record<string, string>;
  commonTemplates: string[];
}

// Regex for validating key=value format (including composite queries)
// Examples: "amenity=restaurant", "sport", "natural=tree;natural=tree_row" (OR with ;)
// AND logic with & separator: "natural=tree&species=*"
// Allows empty values: "key=" (treated as wildcard in Overpass)
const KV_PATTERN =
  /^(?:[a-z_][a-z0-9_]*(?:=?[^;&]*)?)(?:[;&][a-z_][a-z0-9_]*(?:=?[^;&]*)?)*$/i;

// Regex for validating kebab-case IDs
const KEBAB_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validate key=value format
 */
export function isValidKv(kv: string): boolean {
  if (!kv || typeof kv !== "string") return false;
  return KV_PATTERN.test(kv.trim());
}

/**
 * Validate kebab-case ID format
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return KEBAB_PATTERN.test(id.trim());
}

/**
 * Convert kebab-case to Title Case
 */
export function toTitleCase(id: string): string {
  if (!id) return "";
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Escape regex metacharacters in a literal value for embedding in an Overpass
 * QL regex filter.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape a literal value for embedding in a double-quoted Overpass QL string.
 */
function escapeQuoted(value: string): string {
  return value.replace(/[\\"]/g, "\\$&");
}

/**
 * Keys whose values are routinely semicolon-combined in OSM, so an exact match
 * would silently miss features (e.g. sport=soccer;basketball).
 *
 * Everything else uses exact match, which lets Overpass hit the value index.
 * The difference is large on high-cardinality keys: for highway=traffic_signals
 * in Tucson the regex form takes 21.4s (and trips the size-check pre-flight)
 * while exact match takes 1.27s. Measured global semicolon usage justifies the
 * split — highway has 1,326 semicolon uses worldwide and natural 213 of 93.0M,
 * whereas sport has 20,452 distinct semicolon-combined values.
 *
 * When adding a template on a key that is not listed here, check taginfo for
 * semicolon-combined values first:
 *   https://taginfo.openstreetmap.org/api/4/key/values?key=<key>&query=%3B
 * and add the key below if they are material.
 */
const MULTI_VALUE_KEYS = new Set([
  "content",
  "healthcare",
  "social_facility:for",
  "species",
  "sport",
  "traffic_calming",
  "traffic_sign",
  "vending",
]);

/**
 * Build Overpass query from key=value pair.
 *
 * Supports composite queries:
 * - OR logic using ; separator: "natural=tree;natural=tree_row"
 *   Example: "natural=tree;natural=tree_row" matches (natural=tree) OR (natural=tree_row)
 * - AND logic using & separator: "natural=tree&species=*"
 *   Example: "natural=tree&species=*" matches elements with BOTH tags
 * - Mixed: "highway=footway;highway=path&surface=paved"
 *   Example: (footway) OR (path WITH paved surface)
 *
 * Value matches use exact equality so Overpass can use its value index. Keys in
 * MULTI_VALUE_KEYS instead use a semicolon-boundary regex ("(^|;)value(;|$)"),
 * since their values are routinely combined (e.g. vending=drinks;food) and an
 * exact match would silently miss those features. See MULTI_VALUE_KEYS for the
 * cost/recall evidence behind the split.
 *
 * Note: YAML is trusted developer input, so no sanitization is needed beyond
 * escaping the value for the form it lands in — regex metacharacters on the
 * MULTI_VALUE_KEYS path, quotes and backslashes on the exact-match path.
 */
export function buildOverpassQuery(kv: string): string {
  // Split on ; to get OR groups
  const orGroups = kv
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const elements: string[] = [];

  for (const group of orGroups) {
    // Split on & to get AND conditions within this OR group
    const andConditions = group
      .split("&")
      .map((p) => p.trim())
      .filter(Boolean);

    // Build tag filters for each AND condition
    const tagFilters: string[] = [];
    for (const condition of andConditions) {
      const [key, value] = condition.split("=");

      if (!key) {
        throw new Error(`Invalid key in kv: "${condition}"`);
      }

      if (value && value !== "*") {
        if (MULTI_VALUE_KEYS.has(key)) {
          tagFilters.push(`"${key}"~"(^|;)${escapeRegex(value)}(;|$)"`);
        } else {
          tagFilters.push(`"${key}"="${escapeQuoted(value)}"`);
        }
      } else {
        tagFilters.push(`"${key}"`);
      }
    }

    // Combine AND filters: ["tag1", "tag2"] -> node["tag1"]["tag2"]
    const filterStr = tagFilters.map((f) => `[${f}]`).join("");

    elements.push(
      `node${filterStr}(area.searchArea);`,
      `way${filterStr}(area.searchArea);`,
      `relation${filterStr}(area.searchArea);`,
    );
  }

  return `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  ${elements.join("\n  ")}
);
out geom meta;`;
}

/**
 * Build area-wrapped Overpass query from multiple queries
 */
export function createAreaQuery(queries: string[]): string {
  return `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  ${queries.join("\n  ")}
);
out geom meta;`;
}

/**
 * Build full ParsedTemplate from TemplateConfig
 */
export function buildTemplate(config: TemplateConfig): ParsedTemplate {
  const {
    id,
    kv,
    category,
    parent,
    name: configName,
    description: configDesc,
    filterableTags,
  } = config;

  if (!isValidId(id)) {
    throw new Error(`Invalid template id: "${id}" (must be kebab-case)`);
  }
  if (!isValidKv(kv)) {
    throw new Error(`Invalid kv format: "${kv}" (must be key=value)`);
  }
  if (!category) {
    throw new Error(`Template "${id}" missing category`);
  }

  const templateName = configName ?? toTitleCase(id);
  const description = configDesc ?? `${templateName} in the area`;
  const overpassQuery = buildOverpassQuery(kv);
  const tags = kv
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    id,
    name: templateName,
    description,
    overpassQuery,
    category,
    tags,
    filterableTags: filterableTags ?? [],
    parent,
  };
}

/**
 * Load templates.yml (logic only: array format)
 */
export function loadTemplatesLogic(basePath: string = DEFAULT_PRISMA): {
  entries: LogicEntry[];
  categories: unknown;
  demonstrators: unknown;
  replacedBy: unknown;
  commonTemplates: unknown;
} {
  const filePath = join(basePath, LOGIC_FILE);
  try {
    const file = readFileSync(filePath, "utf8");
    const config = yaml.load(file) as {
      templates?: unknown[];
      categories?: unknown;
      filterableTags?: Record<string, unknown>;
      demonstrators?: unknown;
      replacedBy?: unknown;
      commonTemplates?: unknown;
    };

    if (!config?.templates || !Array.isArray(config.templates)) {
      throw new Error("Invalid templates.yml: templates must be an array");
    }

    // Sparse per-template allow-list of tag keys that become legend views.
    // Templates absent from this map fall back to the age view only.
    const filterableByIdRaw = config.filterableTags ?? {};
    const filterableById = new Map<string, string[]>();
    for (const [id, tags] of Object.entries(filterableByIdRaw)) {
      // Guard hand-edited YAML: a scalar/object or non-string array element would
      // otherwise disable the template silently or produce "[object Object]" keys.
      if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
        console.warn(
          `templates.yml: filterableTags for "${id}" must be a string array`,
        );
        continue;
      }
      filterableById.set(id, tags.map((tag) => tag.trim()).filter(Boolean));
    }

    const entries: LogicEntry[] = [];
    const seenIds = new Set<string>();
    for (const row of config.templates) {
      const arr = Array.isArray(row) ? row : [row];
      const id = String(arr[0] ?? "");
      const query = String(arr[1] ?? "");
      const category = String(arr[2] ?? "");
      const iconRaw = arr[3];
      const parentRaw = arr[4];
      if (id && query && category) {
        seenIds.add(id);
        entries.push({
          id,
          query,
          category,
          icon:
            iconRaw !== undefined && iconRaw !== null && String(iconRaw) !== ""
              ? String(iconRaw)
              : undefined,
          parent:
            parentRaw !== undefined && parentRaw !== null && String(parentRaw) !== ""
              ? String(parentRaw)
              : undefined,
          filterableTags: filterableById.get(id),
        });
      }
    }

    // Surface typo'd/stale ids under `filterableTags:` — they attach to nothing
    // and would silently leave a template age-only. Warn rather than throw so a
    // bad key never blocks the seed.
    const unmatched = [...filterableById.keys()].filter((id) => !seenIds.has(id));
    if (unmatched.length > 0) {
      console.warn(
        `templates.yml: filterableTags references unknown template id(s): ${unmatched.join(", ")}`,
      );
    }

    return {
      entries,
      categories: config.categories ?? {},
      demonstrators: config.demonstrators ?? {},
      replacedBy: config.replacedBy ?? {},
      commonTemplates: config.commonTemplates,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to load ${filePath}: unknown error`);
  }
}

/**
 * Load templates.i18n.yml (translations only)
 */
export function loadTemplatesI18n(
  basePath: string = DEFAULT_PRISMA,
): I18nConfig {
  const filePath = join(basePath, I18N_FILE);
  try {
    const file = readFileSync(filePath, "utf8");
    const config = yaml.load(file) as I18nConfig;

    if (
      !config?.templates ||
      typeof config.templates !== "object" ||
      Array.isArray(config.templates)
    ) {
      throw new Error(
        "Invalid templates.i18n.yml: templates must be an object keyed by template id",
      );
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to load ${filePath}: unknown error`);
  }
}

/**
 * Load templates.yml (logic only) and return keyed config
 */
export function loadTemplatesYaml(
  basePath: string = DEFAULT_PRISMA,
): LogicConfig {
  const { entries, categories, demonstrators, replacedBy, commonTemplates } =
    loadTemplatesLogic(basePath);
  const templates: Record<string, TemplateLogic> = {};
  for (const entry of entries) {
    templates[entry.id] = {
      query: entry.query,
      category: entry.category,
      icon: entry.icon,
      parent: entry.parent,
      filterableTags: entry.filterableTags,
    };
  }
  return { templates, categories, demonstrators, replacedBy, commonTemplates };
}

/**
 * Validate the `demonstrators:` section against the set of known template ids.
 * A typo'd id or malformed relation id fails the sync loudly instead of pointing
 * the workflow at nothing. One error per problem; an empty/absent section is valid.
 */
export function validateDemonstrators(
  demonstrators: unknown,
  knownIds: Set<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (demonstrators === undefined || demonstrators === null) return errors;
  if (typeof demonstrators !== "object" || Array.isArray(demonstrators)) {
    errors.push({
      field: "demonstrators",
      message: "demonstrators must be a map keyed by template id",
    });
    return errors;
  }

  for (const [templateId, list] of Object.entries(demonstrators)) {
    if (!knownIds.has(templateId)) {
      errors.push({
        field: "demonstrators",
        message: `demonstrators references unknown template id: "${templateId}"`,
      });
      continue;
    }
    if (!Array.isArray(list)) {
      errors.push({
        field: "demonstrators",
        message: `demonstrators for "${templateId}" must be a list`,
      });
      continue;
    }
    list.forEach((entry, i) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        errors.push({
          field: "demonstrators",
          message: `demonstrators["${templateId}"][${i}] must be an object with an "area"`,
        });
        return;
      }
      const { area, note } = entry as { area?: unknown; note?: unknown };
      if (typeof area !== "number" || !Number.isInteger(area) || area <= 0) {
        errors.push({
          field: "demonstrators",
          message: `demonstrators["${templateId}"][${i}].area must be a positive integer OSM relation id`,
        });
      }
      if (note !== undefined && typeof note !== "string") {
        errors.push({
          field: "demonstrators",
          message: `demonstrators["${templateId}"][${i}].note must be a string`,
        });
      }
    });
  }

  return errors;
}

export function validateReplacedBy(
  replacedBy: unknown,
  activeIds: Set<string>,
): { replacedBy: Record<string, string>; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const map: Record<string, string> = {};
  if (replacedBy === undefined || replacedBy === null) return { replacedBy: map, errors };
  if (typeof replacedBy !== "object" || Array.isArray(replacedBy)) {
    errors.push({ field: "replacedBy", message: "replacedBy must be a map of old id to new id" });
    return { replacedBy: map, errors };
  }

  for (const [oldId, newId] of Object.entries(replacedBy)) {
    if (typeof newId !== "string") {
      errors.push({
        field: "replacedBy",
        message: `replacedBy["${oldId}"] must be a template id`,
      });
    } else if (activeIds.has(oldId)) {
      errors.push({
        field: "replacedBy",
        message: `replacedBy: "${oldId}" is still an active template, remove it from templates first`,
      });
    } else if (!activeIds.has(newId)) {
      errors.push({
        field: "replacedBy",
        message: `replacedBy["${oldId}"]: "${newId}" is not an active template`,
      });
    } else {
      map[oldId] = newId;
    }
  }

  // All or nothing, so no caller ever applies part of a broken section
  return { replacedBy: errors.length === 0 ? map : {}, errors };
}

export function validateCommonTemplates(
  commonTemplates: unknown,
  activeIds: Set<string>,
): { commonTemplates: string[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (commonTemplates === undefined || commonTemplates === null) {
    return { commonTemplates: [], errors };
  }
  if (!Array.isArray(commonTemplates)) {
    errors.push({
      field: "commonTemplates",
      message: "commonTemplates must be a list of template ids",
    });
    return { commonTemplates: [], errors };
  }

  const seen = new Set<string>();
  for (const id of commonTemplates) {
    if (typeof id !== "string" || !activeIds.has(id)) {
      errors.push({
        field: "commonTemplates",
        message: `commonTemplates: "${String(id)}" is not an active template`,
      });
    } else if (seen.has(id)) {
      errors.push({
        field: "commonTemplates",
        message: `commonTemplates: "${id}" is listed twice`,
      });
    }
    seen.add(String(id));
  }

  return {
    commonTemplates: errors.length === 0 ? (commonTemplates as string[]) : [],
    errors,
  };
}

/**
 * Validate the `categories:` tree: each entry is `{ icon, parent? }` and a
 * parent is always a topic, so the tree is at most topic -> child. That one
 * rule also rules out cycles and self-parents. One error per problem.
 */
export function validateCategories(raw: unknown): {
  categories: ParsedCategory[];
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push({
      field: "categories",
      message: "categories must be a map keyed by category slug",
    });
    return { categories: [], errors };
  }

  const bySlug = new Map<string, ParsedCategory>();
  for (const [slug, def] of Object.entries(raw)) {
    const { icon, parent } = (def ?? {}) as { icon?: unknown; parent?: unknown };
    if (typeof icon !== "string" || (parent !== undefined && (typeof parent !== "string" || !parent))) {
      errors.push({
        field: "categories",
        message: `Category "${slug}" must be an object with a string "icon" and an optional string "parent"`,
      });
      continue;
    }
    bySlug.set(slug, { slug, icon, parent });
  }

  for (const category of bySlug.values()) {
    if (!category.parent) continue;
    if (!bySlug.has(category.parent)) {
      errors.push({
        field: "categories",
        message: `Category "${category.slug}" references unknown parent: "${category.parent}"`,
      });
      continue;
    }
    if (bySlug.get(category.parent)?.parent) {
      errors.push({
        field: "categories",
        message: `Category "${category.slug}" must have a topic as parent, not "${category.parent}"`,
      });
    }
  }

  return { categories: [...bySlug.values()], errors };
}

/**
 * Parse all templates from logic-only config (name/description use fallbacks; seed merges i18n)
 */
export function parseTemplates(config: LogicConfig): ParseResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const templates: ParsedTemplate[] = [];
  const seenIds = new Set<string>();
  let index = 0;

  for (const [id, obj] of Object.entries(config.templates)) {
    try {
      if (seenIds.has(id)) {
        errors.push({
          field: "id",
          message: `Duplicate template id: "${id}"`,
          index,
        });
        index++;
        continue;
      }
      seenIds.add(id);

      if (!obj?.query || !obj?.category) {
        errors.push({
          field: "required",
          message: `Missing required field (query, category)`,
          index,
        });
        index++;
        continue;
      }

      const parsed: TemplateConfig = {
        id,
        kv: obj.query,
        category: obj.category,
        icon: obj.icon,
        parent: obj.parent,
        filterableTags: obj.filterableTags,
      };
      const template = buildTemplate(parsed);
      templates.push(template);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ field: "general", message, index });
    }
    index++;
  }

  const parsedIds = new Set(templates.map((t) => t.id));
  for (const template of templates) {
    if (template.parent && !parsedIds.has(template.parent)) {
      errors.push({
        field: "parent",
        message: `Template "${template.id}" references unknown parent id: "${template.parent}"`,
      });
    }
  }

  errors.push(...validateDemonstrators(config.demonstrators, parsedIds));

  const { replacedBy, errors: replacedByErrors } = validateReplacedBy(
    config.replacedBy,
    parsedIds,
  );
  errors.push(...replacedByErrors);

  const { commonTemplates, errors: commonErrors } = validateCommonTemplates(
    config.commonTemplates,
    parsedIds,
  );
  errors.push(...commonErrors);

  const { categories, errors: categoryErrors } = validateCategories(
    config.categories ?? {},
  );
  errors.push(...categoryErrors);
  const declared = new Set(categories.map((c) => c.slug));
  for (const template of templates) {
    if (!declared.has(template.category)) {
      errors.push({
        field: "category",
        message: `Template "${template.id}" references undeclared category: "${template.category}"`,
      });
    }
  }

  return { templates, categories, errors, warnings, replacedBy, commonTemplates };
}

/**
 * Collect category icons from the explicit categories section only
 */
export function collectCategoryIcons(config: LogicConfig): Map<string, string> {
  return new Map(
    validateCategories(config.categories ?? {}).categories.map((c) => [c.slug, c.icon]),
  );
}

/**
 * Collect per-template icons (template id -> icon name)
 */
export function collectTemplateIcons(config: LogicConfig): Map<string, string> {
  const iconMap = new Map<string, string>();
  for (const [id, obj] of Object.entries(config.templates)) {
    if (obj.icon) {
      iconMap.set(id, obj.icon);
    }
  }
  return iconMap;
}
