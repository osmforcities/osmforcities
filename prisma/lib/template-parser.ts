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
}

/**
 * Logic-only template value (no i18n)
 */
export interface TemplateLogic {
  query: string;
  category: string;
  icon?: string;
}

/**
 * Logic-only config from templates.yml (used by parseTemplates and collectIcons)
 */
export interface LogicConfig {
  templates: Record<string, TemplateLogic>;
  categories?: Record<string, string>;
}

/**
 * I18n data from templates.i18n.yml (used only by seed)
 */
export interface TemplatesI18n {
  name: { en: string; pt: string };
  desc: { en: string; pt: string };
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
  name?: string;
  description?: string;
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
  errors: ValidationError[];
  warnings: string[];
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
 * Note: YAML is trusted developer input, so no sanitization is needed.
 * Overpass QL handles its own escaping for query values.
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
        tagFilters.push(`"${key}"="${value}"`);
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
    name: configName,
    description: configDesc,
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
  };
}

/**
 * Load templates.yml (logic only: array format)
 */
export function loadTemplatesLogic(basePath: string = DEFAULT_PRISMA): {
  entries: LogicEntry[];
  categories: Record<string, string>;
} {
  const filePath = join(basePath, LOGIC_FILE);
  try {
    const file = readFileSync(filePath, "utf8");
    const config = yaml.load(file) as {
      templates?: unknown[];
      categories?: Record<string, string>;
    };

    if (!config?.templates || !Array.isArray(config.templates)) {
      throw new Error("Invalid templates.yml: templates must be an array");
    }

    const entries: LogicEntry[] = [];
    for (const row of config.templates) {
      const arr = Array.isArray(row) ? row : [row];
      const id = String(arr[0] ?? "");
      const query = String(arr[1] ?? "");
      const category = String(arr[2] ?? "");
      const iconRaw = arr[3];
      if (id && query && category) {
        entries.push({
          id,
          query,
          category,
          icon:
            iconRaw !== undefined && iconRaw !== null && String(iconRaw) !== ""
              ? String(iconRaw)
              : undefined,
        });
      }
    }

    return {
      entries,
      categories: config.categories ?? {},
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
  const { entries, categories } = loadTemplatesLogic(basePath);
  const templates: Record<string, TemplateLogic> = {};
  for (const entry of entries) {
    templates[entry.id] = {
      query: entry.query,
      category: entry.category,
      icon: entry.icon,
    };
  }
  return { templates, categories };
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
      };
      const template = buildTemplate(parsed);
      templates.push(template);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ field: "general", message, index });
    }
    index++;
  }

  return { templates, errors, warnings };
}

/**
 * Get category and optional icon from a template (for icon generation)
 */
export function getTemplateCategoryIcon(obj: TemplateLogic): {
  category: string;
  icon?: string;
} {
  return { category: obj.category, icon: obj.icon };
}

/**
 * Collect all unique icons from templates and categories
 */
export function collectIcons(config: LogicConfig): Map<string, string> {
  const iconMap = new Map<string, string>();

  for (const obj of Object.values(config.templates)) {
    const { category, icon } = getTemplateCategoryIcon(obj);
    if (category && icon && !iconMap.has(category)) {
      iconMap.set(category, icon);
    }
  }

  for (const [category, icon] of Object.entries(config.categories || {})) {
    if (!iconMap.has(category)) {
      iconMap.set(category, icon);
    }
  }

  return iconMap;
}
