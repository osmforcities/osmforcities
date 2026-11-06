/**
 * Unit tests for template-parser utilities
 *
 * Run with: pnpm test:unit (after adding vitest)
 *
 * To enable these tests:
 * 1. pnpm add -D vitest @vitest/ui
 * 2. Add "test:unit": "vitest" to package.json scripts
 * 3. Create vitest.config.ts
 */

import { describe, it, expect } from "vitest";
import {
  isValidKv,
  isValidId,
  toTitleCase,
  buildOverpassQuery,
  createAreaQuery,
  buildTemplate,
  parseTemplates,
  loadTemplatesYaml,
  loadTemplatesLogic,
  loadTemplatesI18n,
  validateDemonstrators,
  validateReplacedBy,
  validateCommonTemplates,
  validateCategories,
} from "../template-parser";
import { AVAILABLE_LOCALES } from "../../../src/i18n/constants";
import { YML_LOCALE_MAP } from "../../../src/lib/constants";

describe("template-parser", () => {
  describe("isValidKv", () => {
    it("accepts valid key=value format", () => {
      expect(isValidKv("amenity=restaurant")).toBe(true);
      expect(isValidKv("shop=supermarket")).toBe(true);
      expect(isValidKv("highway=bus_stop")).toBe(true);
    });

    it("accepts key-only format", () => {
      expect(isValidKv("sport")).toBe(true);
    });

    it("accepts empty value", () => {
      expect(isValidKv("key=")).toBe(true);
    });

    it("rejects invalid formats", () => {
      expect(isValidKv("")).toBe(false);
      expect(isValidKv("=value")).toBe(false);
      expect(isValidKv("key=value;")).toBe(false); // trailing semicolon not allowed
      expect(isValidKv("key;=value")).toBe(false); // = in second part but no key
      expect(isValidKv("123key=value")).toBe(false); // key starts with number
      expect(isValidKv("key=value;123bad=value")).toBe(false); // second key starts with number
    });

    it("accepts composite queries with ; separator", () => {
      expect(isValidKv("natural=tree;natural=tree_row")).toBe(true);
      expect(isValidKv("highway=footway;highway=path")).toBe(true);
      expect(
        isValidKv(
          "building=house;building=detached;building=semidetached_house",
        ),
      ).toBe(true);
    });

    it("accepts wildcard * for any value", () => {
      expect(isValidKv("species=*")).toBe(true);
      expect(isValidKv("natural=tree;species=*")).toBe(true);
    });

    it("accepts AND queries with & separator", () => {
      expect(isValidKv("natural=tree&species=*")).toBe(true);
      expect(isValidKv("highway=path&surface=paved")).toBe(true);
      expect(isValidKv("building=house&roof:shape=flat")).toBe(true);
    });

    it("accepts mixed OR and AND queries", () => {
      expect(isValidKv("highway=footway;highway=path&surface=paved")).toBe(
        true,
      );
      expect(
        isValidKv("natural=tree&species=*;natural=tree_row&species=*"),
      ).toBe(true);
    });
  });

  describe("isValidId", () => {
    it("accepts valid kebab-case IDs", () => {
      expect(isValidId("bicycle-parking")).toBe(true);
      expect(isValidId("bus-stops")).toBe(true);
      expect(isValidId("tree-rows")).toBe(true);
      expect(isValidId("atms")).toBe(true);
    });

    it("rejects invalid IDs", () => {
      expect(isValidId("")).toBe(false);
      expect(isValidId("Bicycle-Parking")).toBe(false); // uppercase
      expect(isValidId("bicycle_parking")).toBe(false); // underscore
      expect(isValidId("bicycle parking")).toBe(false); // space
    });
  });

  describe("toTitleCase", () => {
    it("converts kebab-case to Title Case", () => {
      expect(toTitleCase("bicycle-parking")).toBe("Bicycle Parking");
      expect(toTitleCase("bus-stops")).toBe("Bus Stops");
      expect(toTitleCase("tree-rows")).toBe("Tree Rows");
    });

    it("handles single words", () => {
      expect(toTitleCase("atms")).toBe("Atms");
      expect(toTitleCase("schools")).toBe("Schools");
    });

    it("handles empty input", () => {
      expect(toTitleCase("")).toBe("");
    });
  });

  describe("buildOverpassQuery", () => {
    it("builds an exact-match query for key=value", () => {
      const query = buildOverpassQuery("amenity=restaurant");
      expect(query).toContain('node["amenity"="restaurant"]');
      expect(query).toContain('way["amenity"="restaurant"]');
      expect(query).toContain('relation["amenity"="restaurant"]');
      expect(query).toContain("area.searchArea");
    });

    it("builds query for key-only", () => {
      const query = buildOverpassQuery("sport");
      expect(query).toContain('node["sport"]');
      expect(query).toContain('way["sport"]');
      expect(query).toContain('relation["sport"]');
    });

    // A value regex cannot use Overpass's value index, so it scans every element
    // carrying the key in the area — 21.4s vs 1.27s for highway=traffic_signals in
    // Tucson. Only keys where semicolon-combined values are actually common keep it.
    it("keeps the semicolon regex for multi-value keys (sport=soccer;basketball)", () => {
      const query = buildOverpassQuery("sport=soccer");
      expect(query).toContain('node["sport"~"(^|;)soccer(;|$)"]');
      expect(query).toContain('way["sport"~"(^|;)soccer(;|$)"]');
      expect(query).toContain('relation["sport"~"(^|;)soccer(;|$)"]');
    });

    it("keeps the semicolon regex for the other multi-value keys", () => {
      expect(buildOverpassQuery("healthcare=laboratory")).toContain(
        '"healthcare"~"(^|;)laboratory(;|$)"',
      );
      expect(buildOverpassQuery("traffic_sign=maxspeed")).toContain(
        '"traffic_sign"~"(^|;)maxspeed(;|$)"',
      );
      expect(buildOverpassQuery("traffic_calming=bump")).toContain(
        '"traffic_calming"~"(^|;)bump(;|$)"',
      );
    });

    it("matches semicolon-combined tag values (e.g. vending=drinks;food)", () => {
      const query = buildOverpassQuery("amenity=vending_machine&vending=food");
      expect(query).toContain('["amenity"="vending_machine"]');
      expect(query).toContain('"vending"~"(^|;)food(;|$)"');
    });

    it("escapes regex metacharacters for multi-value keys", () => {
      const query = buildOverpassQuery("healthcare=Eat+Fresh");
      expect(query).toContain('"healthcare"~"(^|;)Eat\\+Fresh(;|$)"');
    });

    it("does not regex-escape exact-match values", () => {
      const query = buildOverpassQuery("brand=Eat+Fresh");
      expect(query).toContain('node["brand"="Eat+Fresh"]');
    });

    it("escapes quotes and backslashes in exact-match values", () => {
      const query = buildOverpassQuery('name=A"B\\C');
      expect(query).toContain('node["name"="A\\"B\\\\C"]');
    });

    it("builds query for composite tags with ; separator", () => {
      const query = buildOverpassQuery("natural=tree;natural=tree_row");
      expect(query).toContain('node["natural"="tree"]');
      expect(query).toContain('node["natural"="tree_row"]');
      expect(query).toContain('way["natural"="tree"]');
      expect(query).toContain('way["natural"="tree_row"]');
      expect(query).toContain('relation["natural"="tree"]');
      expect(query).toContain('relation["natural"="tree_row"]');
    });

    it("builds query for 3+ composite tags", () => {
      const query = buildOverpassQuery(
        "building=house;building=detached;building=semidetached_house",
      );
      expect(query).toContain('node["building"="house"]');
      expect(query).toContain('node["building"="detached"]');
      expect(query).toContain('node["building"="semidetached_house"]');
    });

    it("builds query for mixed key-only and key=value composites", () => {
      const query = buildOverpassQuery("sport;sport=football");
      expect(query).toContain('node["sport"]');
      expect(query).toContain('node["sport"~"(^|;)football(;|$)"]');
    });

    it("builds query for AND conditions with & separator", () => {
      const query = buildOverpassQuery("natural=tree&species=*");
      expect(query).toContain('node["natural"="tree"]["species"]');
      expect(query).toContain('way["natural"="tree"]["species"]');
      expect(query).toContain('relation["natural"="tree"]["species"]');
    });

    it("builds query for multiple AND conditions", () => {
      const query = buildOverpassQuery("highway=path&surface=paved&lit=yes");
      expect(query).toContain(
        'node["highway"="path"]["surface"="paved"]["lit"="yes"]',
      );
    });

    it("builds query for mixed OR and AND", () => {
      const query = buildOverpassQuery(
        "highway=footway;highway=path&surface=paved",
      );
      expect(query).toContain('node["highway"="footway"]');
      expect(query).toContain('node["highway"="path"]["surface"="paved"]');
    });

    it("uses the indexed fast path for the traffic-lights template", () => {
      const query = buildOverpassQuery("highway=traffic_signals");
      expect(query).toContain('node["highway"="traffic_signals"]');
      expect(query).not.toContain("~");
    });
  });

  describe("createAreaQuery", () => {
    it("wraps queries in area boilerplate", () => {
      const query = createAreaQuery([
        'node["amenity"="restaurant"](area.searchArea);',
      ]);
      expect(query).toContain("[out:json][timeout:25]");
      expect(query).toContain("map_to_area -> .searchArea");
      expect(query).toContain("out geom meta");
    });
  });

  describe("buildTemplate", () => {
    it("builds full template with all fields", () => {
      const config = {
        id: "test-restaurants",
        kv: "amenity=restaurant",
        category: "food",
      };
      const template = buildTemplate(config);
      expect(template.id).toBe("test-restaurants");
      expect(template.name).toBe("Test Restaurants");
      expect(template.description).toBe("Test Restaurants in the area");
      expect(template.category).toBe("food");
      expect(template.tags).toEqual(["amenity=restaurant"]);
      expect(template.overpassQuery).toContain('node["amenity"="restaurant"]');
    });

    it("auto-generates name and description when not provided", () => {
      const config = {
        id: "bicycle-parking",
        kv: "amenity=bicycle_parking",
        category: "transportation",
      };
      const template = buildTemplate(config);
      expect(template.name).toBe("Bicycle Parking");
      expect(template.description).toBe("Bicycle Parking in the area");
    });

    it("uses provided name and description from i18n", () => {
      const config = {
        id: "bicycle-parking",
        kv: "amenity=bicycle_parking",
        category: "transportation",
        name: "Bicycle parking",
        description: "Bicycle parking in the area",
      };
      const template = buildTemplate(config);
      expect(template.name).toBe("Bicycle parking");
      expect(template.description).toBe("Bicycle parking in the area");
    });

    it("throws for invalid ID", () => {
      const config = {
        id: "Invalid_ID",
        kv: "amenity=restaurant",
        category: "food",
      };
      expect(() => buildTemplate(config)).toThrow("Invalid template id");
    });

    it("throws for invalid kv", () => {
      const config = {
        id: "test",
        kv: "=value",
        category: "food",
      };
      expect(() => buildTemplate(config)).toThrow("Invalid kv format");
    });

    it("handles composite queries in tags array", () => {
      const config = {
        id: "trees",
        kv: "natural=tree;natural=tree_row",
        category: "nature",
      };
      const template = buildTemplate(config);
      expect(template.tags).toEqual(["natural=tree", "natural=tree_row"]);
      expect(template.overpassQuery).toContain('node["natural"="tree"]');
      expect(template.overpassQuery).toContain('node["natural"="tree_row"]');
    });
  });

  describe("parseTemplates (logic-only config)", () => {
    it("parses logic-only templates with fallback name/description", () => {
      const config = {
        templates: {
          "bicycle-parking": {
            query: "amenity=bicycle_parking",
            category: "transportation",
            icon: "Bike",
          },
        },
        categories: { transportation: { icon: "Car" } },
      };
      const result = parseTemplates(config);
      expect(result.errors).toHaveLength(0);
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe("bicycle-parking");
      expect(result.templates[0].name).toBe("Bicycle Parking");
      expect(result.templates[0].description).toBe(
        "Bicycle Parking in the area",
      );
      expect(result.templates[0].category).toBe("transportation");
    });

    it("rejects a template whose category is not declared", () => {
      const result = parseTemplates({
        templates: { parking: { query: "amenity=parking", category: "transport" } },
        categories: { mobility: { icon: "Car" } },
      });
      expect(result.errors.map((e) => e.message)).toContain(
        'Template "parking" references undeclared category: "transport"',
      );
    });

    it("returns the declared categories", () => {
      const result = parseTemplates({
        templates: { parking: { query: "amenity=parking", category: "roads" } },
        categories: {
          mobility: { icon: "Car" },
          roads: { icon: "Route", parent: "mobility" },
        },
      });
      expect(result.errors).toHaveLength(0);
      expect(result.categories).toEqual([
        { slug: "mobility", icon: "Car" },
        { slug: "roads", icon: "Route", parent: "mobility" },
      ]);
    });
  });

  describe("validateCategories", () => {
    const messages = (raw: unknown) =>
      validateCategories(raw).errors.map((e) => e.message);

    it("accepts topics with children", () => {
      const { categories, errors } = validateCategories({
        mobility: { icon: "Car" },
        bus: { icon: "Bus", parent: "mobility" },
      });
      expect(errors).toEqual([]);
      expect(categories).toHaveLength(2);
    });

    it("rejects an unknown parent", () => {
      expect(messages({ bus: { icon: "Bus", parent: "transit" } })).toEqual([
        'Category "bus" references unknown parent: "transit"',
      ]);
    });

    it("rejects a cycle", () => {
      expect(
        messages({
          a: { icon: "Car", parent: "b" },
          b: { icon: "Car", parent: "a" },
        }),
      ).toEqual([
        'Category "a" must have a topic as parent, not "b"',
        'Category "b" must have a topic as parent, not "a"',
      ]);
    });

    it("rejects a self parent", () => {
      expect(messages({ a: { icon: "Car", parent: "a" } })).toEqual([
        'Category "a" must have a topic as parent, not "a"',
      ]);
    });

    it("rejects depth over 2", () => {
      expect(
        messages({
          mobility: { icon: "Car" },
          transit: { icon: "Bus", parent: "mobility" },
          bus: { icon: "Bus", parent: "transit" },
        }),
      ).toEqual(['Category "bus" must have a topic as parent, not "transit"']);
    });

    it("rejects a malformed entry", () => {
      expect(messages({ bus: "Bus" })).toEqual([
        'Category "bus" must be an object with a string "icon" and an optional string "parent"',
      ]);
      expect(messages(["bus"])).toEqual([
        "categories must be a map keyed by category slug",
      ]);
    });

    it("rejects an empty parent instead of treating it as a topic", () => {
      expect(messages({ bus: { icon: "Bus", parent: "" } })).toEqual([
        'Category "bus" must be an object with a string "icon" and an optional string "parent"',
      ]);
    });
  });

  describe("loadTemplatesLogic", () => {
    it("loads templates.yml array format and returns entries + categories", () => {
      const { entries, categories } = loadTemplatesLogic("./prisma");
      expect(entries.length).toBeGreaterThan(0);
      const byId = new Map(entries.map((e) => [e.id, e]));
      expect(byId.get("bicycle-parking")).toEqual({
        id: "bicycle-parking",
        query: "amenity=bicycle_parking",
        category: "cycling",
        icon: "Bike",
        filterableTags: [
          "bicycle_parking",
          "covered",
          "capacity",
          "access",
          "fee",
        ],
      });
      // parent parsing (5th element) is still exercised by public-transit children
      expect(byId.get("bus-stops")?.parent).toBe("public-transit");
      expect(categories).toMatchObject({
        mobility: { icon: "BusFront" },
        agriculture: { icon: "Wheat", parent: "nature-environment" },
      });
    });

    it("attaches per-template filterableTags from the map (curated only)", () => {
      const { entries } = loadTemplatesLogic("./prisma");
      const byId = new Map(entries.map((e) => [e.id, e]));
      // Curated templates carry their list
      expect(byId.get("bus-stops")?.filterableTags).toEqual([
        "shelter",
        "bench",
        "lit",
        "tactile_paving",
        "wheelchair",
        "operator",
      ]);
      // Uncurated templates have no list (age-only in the legend)
      expect(byId.get("golf-courses")?.filterableTags).toBeUndefined();
    });

    it("folds the old tree templates into one trees template", () => {
      const result = parseTemplates(loadTemplatesYaml("./prisma"));
      const trees = result.templates.find((t) => t.id === "trees");
      expect(trees?.category).toBe("nature");
      expect(trees?.filterableTags).toEqual(["natural", "leaf_type", "leaf_cycle", "denotation", "genus"]);
      expect(trees?.overpassQuery).toContain('"natural"="tree_group"');
      expect(result.replacedBy).toMatchObject({
        "urban-trees": "trees",
        "street-trees": "trees",
        "trees-with-species": "trees",
        "vegetation-risk-context": "trees",
      });
    });
  });

  describe("loadTemplatesI18n", () => {
    it("loads templates.i18n.yml and returns keyed name/desc per id", () => {
      const config = loadTemplatesI18n("./prisma");
      expect(config.templates["bicycle-parking"]).toBeDefined();
      expect(config.templates["bicycle-parking"].name.en).toBe(
        "Bicycle parking",
      );
      expect(config.templates["bicycle-parking"].desc.en).toBeDefined();
      expect(config.templates["bicycle-parking"].name.pt).toBeDefined();
    });

    it("gives every template a distinct name within each locale", () => {
      const idsByLocaleName = new Map<string, string[]>();
      for (const [id, { name }] of Object.entries(
        loadTemplatesI18n("./prisma").templates,
      )) {
        for (const [locale, label] of Object.entries(name)) {
          const key = `${locale}: ${label}`;
          idsByLocaleName.set(key, [...(idsByLocaleName.get(key) ?? []), id]);
        }
      }
      const clashes = [...idsByLocaleName].filter(([, ids]) => ids.length > 1);
      expect(clashes).toEqual([]);
    });

    it("gives every template in a described topic a short desc distinct from its name in every locale", () => {
      const MAX_DESC_LENGTH = 60;
      const DESCRIBED_TOPICS = [
        "mobility",
        "health",
        "leisure-sports",
        "tourism",
        "nature-environment",
        "emergency",
        "education-culture",
        "shops-services",
        "public-services",
        "buildings-infrastructure",
      ];
      const { templates, categories } = parseTemplates(loadTemplatesYaml("./prisma"));
      const describedCategorySlugs = categories
        .filter((c) => DESCRIBED_TOPICS.includes(c.parent ?? c.slug))
        .map((c) => c.slug);
      const i18n = loadTemplatesI18n("./prisma").templates;
      const problems = templates
        .filter((t) => describedCategorySlugs.includes(t.category))
        .flatMap((t) =>
          AVAILABLE_LOCALES.map((locale) => {
            const ymlLocale = YML_LOCALE_MAP[locale] ?? locale;
            const name = i18n[t.id]?.name?.[ymlLocale];
            const desc = i18n[t.id]?.desc?.[ymlLocale];
            if (!name || !desc) return `${t.id} ${ymlLocale}: missing`;
            if (desc === name) return `${t.id} ${ymlLocale}: desc equals name`;
            if (desc.length > MAX_DESC_LENGTH)
              return `${t.id} ${ymlLocale}: desc over ${MAX_DESC_LENGTH} chars`;
            return null;
          }),
        )
        .filter(Boolean);
      expect(problems).toEqual([]);
    });
  });

  describe("loadTemplatesYaml", () => {
    it("loads templates.yml (logic only) and parseTemplates succeeds", () => {
      const config = loadTemplatesYaml("./prisma");
      expect(config.templates).toBeDefined();
      expect(typeof config.templates).toBe("object");
      expect(Array.isArray(config.templates)).toBe(false);
      const result = parseTemplates(config);
      expect(result.errors).toHaveLength(0);
      expect(result.templates.length).toBeGreaterThan(0);
      const first = result.templates[0];
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.description).toBeDefined();
      expect(first.overpassQuery).toContain("area.searchArea");
    });

    it("declares the 10 topics and puts fuel under mobility", () => {
      const result = parseTemplates(loadTemplatesYaml("./prisma"));
      const topics = result.categories.filter((c) => !c.parent).map((c) => c.slug);
      expect(topics.sort()).toEqual([
        "buildings-infrastructure",
        "education-culture",
        "emergency",
        "health",
        "leisure-sports",
        "mobility",
        "nature-environment",
        "public-services",
        "shops-services",
        "tourism",
      ]);
      const slugs = result.categories.map((c) => c.slug);
      expect(slugs).not.toContain("transport");
      expect(slugs).not.toContain("other");
      expect(result.templates.find((t) => t.id === "fuel")?.category).toBe("mobility");
    });

    it("keeps historic places under heritage and burial places under religion", () => {
      const result = parseTemplates(loadTemplatesYaml("./prisma"));
      const idsIn = (category: string) =>
        result.templates.filter((t) => t.category === category).map((t) => t.id).sort();
      expect(result.categories.find((c) => c.slug === "heritage")?.parent).toBe(
        "education-culture",
      );
      expect(idsIn("heritage")).toEqual([
        "archaeological-sites",
        "castles",
        "heritage-sites",
        "memorials",
        "monuments",
        "ruins",
      ]);
      expect(idsIn("religion")).toEqual(["cemeteries", "places-of-worship", "shrines"]);
    });

    it("exposes the demonstrators section keyed by template id", () => {
      const config = loadTemplatesYaml("./prisma");
      expect(config.demonstrators).toBeDefined();
      const demonstrators = config.demonstrators as Record<string, unknown>;
      const busStops = demonstrators["bus-stops"];
      expect(Array.isArray(busStops)).toBe(true);
      expect((busStops as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe("validateDemonstrators", () => {
    const known = new Set(["bus-stops", "cycleways"]);

    it("returns no errors for a valid section", () => {
      const errors = validateDemonstrators(
        {
          "bus-stops": [
            { area: 54517, note: "Rennes" },
            { area: 451516 },
          ],
        },
        known,
      );
      expect(errors).toHaveLength(0);
    });

    it("accepts an empty or absent section", () => {
      expect(validateDemonstrators(undefined, known)).toHaveLength(0);
      expect(validateDemonstrators(null, known)).toHaveLength(0);
      expect(validateDemonstrators({}, known)).toHaveLength(0);
    });

    it("errors on a scalar or array root (hand-edited YAML)", () => {
      for (const root of [42, true, "bus-stops", [{ area: 54517 }]]) {
        const errors = validateDemonstrators(root, known);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("map keyed by template id");
      }
    });

    it("errors on an unknown template id", () => {
      const errors = validateDemonstrators(
        { "bus-stopz": [{ area: 54517 }] },
        known,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("unknown template id");
    });

    it("errors when the value is not a list", () => {
      const errors = validateDemonstrators(
        { "bus-stops": { area: 54517 } as unknown as unknown[] },
        known,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("must be a list");
    });

    it("errors on a non-integer or non-positive area", () => {
      const errors = validateDemonstrators(
        {
          "bus-stops": [
            { area: 1.5 },
            { area: -3 },
            { area: "54517" as unknown as number },
          ],
        },
        known,
      );
      expect(errors).toHaveLength(3);
      for (const e of errors) {
        expect(e.message).toContain("positive integer");
      }
    });

    it("errors when an entry is not an object", () => {
      const errors = validateDemonstrators(
        { "bus-stops": [54517 as unknown as object] },
        known,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be an object');
    });

    it("errors when note is not a string", () => {
      const errors = validateDemonstrators(
        { "bus-stops": [{ area: 54517, note: 42 as unknown as string }] },
        known,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("note must be a string");
    });
  });

  describe("validateReplacedBy", () => {
    const active = new Set(["streets", "trees"]);

    it("returns a valid map with no errors", () => {
      expect(validateReplacedBy({ highways: "streets" }, active)).toEqual({
        replacedBy: { highways: "streets" },
        errors: [],
      });
    });

    it("returns no map when any pointer is bad", () => {
      const { replacedBy } = validateReplacedBy({ highways: "streets", roads: "nope" }, active);
      expect(replacedBy).toEqual({});
    });

    it("accepts an empty or absent section", () => {
      expect(validateReplacedBy(undefined, active).errors).toHaveLength(0);
      expect(validateReplacedBy(null, active).errors).toHaveLength(0);
      expect(validateReplacedBy({}, active).errors).toHaveLength(0);
    });

    it("errors on a scalar or array root", () => {
      for (const root of [42, "streets", ["highways", "streets"]]) {
        const { errors } = validateReplacedBy(root, active);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("map of old id to new id");
      }
    });

    it("errors when the replacement is missing from the template list", () => {
      const { errors } = validateReplacedBy({ highways: "streetz" }, active);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('"streetz" is not an active template');
    });

    it("errors when the replacement is itself deprecated", () => {
      const { errors } = validateReplacedBy(
        { highways: "roads", roads: "streets" },
        active,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('"roads" is not an active template');
    });

    it("errors when the deprecated id is still in the template list", () => {
      const { errors } = validateReplacedBy({ trees: "streets" }, active);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('"trees" is still an active template');
    });

    it("errors when the value is not a string", () => {
      const { errors } = validateReplacedBy({ highways: 42 }, active);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("must be a template id");
    });
  });

  describe("parseTemplates replacedBy", () => {
    const templates = { streets: { query: "highway=residential", category: "transport" } };
    const categories = { transport: { icon: "bus" } };

    it("returns the validated map", () => {
      const result = parseTemplates({ templates, categories, replacedBy: { highways: "streets" } });
      expect(result.errors).toHaveLength(0);
      expect(result.replacedBy).toEqual({ highways: "streets" });
    });

    it("fails and returns no map on a bad pointer", () => {
      const result = parseTemplates({ templates, categories, replacedBy: { highways: "nope" } });
      expect(result.errors).toHaveLength(1);
      expect(result.replacedBy).toEqual({});
    });
  });
  describe("validateCommonTemplates", () => {
    const active = new Set(["bus-stops", "schools"]);

    it("returns the ids in YAML order", () => {
      expect(validateCommonTemplates(["schools", "bus-stops"], active)).toEqual({
        commonTemplates: ["schools", "bus-stops"],
        errors: [],
      });
    });

    it("accepts an absent section", () => {
      expect(validateCommonTemplates(undefined, active)).toEqual({
        commonTemplates: [],
        errors: [],
      });
    });

    it("errors on a non-list root", () => {
      const { errors } = validateCommonTemplates({ "bus-stops": 1 }, active);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("list of template ids");
    });

    it("errors on a missing or deprecated id and returns no list", () => {
      const result = validateCommonTemplates(["bus-stops", "trees"], active);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('"trees" is not an active template');
      expect(result.commonTemplates).toEqual([]);
    });

    it("errors on a duplicate id", () => {
      const { errors } = validateCommonTemplates(["schools", "schools"], active);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('"schools" is listed twice');
    });
  });

  describe("parseTemplates commonTemplates", () => {
    const templates = { streets: { query: "highway=residential", category: "transport" } };
    const categories = { transport: { icon: "bus" } };

    it("returns the validated list", () => {
      const result = parseTemplates({ templates, categories, commonTemplates: ["streets"] });
      expect(result.errors).toHaveLength(0);
      expect(result.commonTemplates).toEqual(["streets"]);
    });

    it("fails on an unknown id", () => {
      const result = parseTemplates({ templates, categories, commonTemplates: ["nope"] });
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("parseTemplates defaultView", () => {
    const templates = {
      buildings: { query: "building", category: "infrastructure", filterableTags: ["building"] },
      streets: { query: "highway=residential", category: "infrastructure" },
    };
    const categories = { infrastructure: { icon: "Gauge" } };
    const defaultViewOf = (result: ReturnType<typeof parseTemplates>, id: string) =>
      result.templates.find((t) => t.id === id)?.defaultView;

    it("sets the view on the named template and null elsewhere", () => {
      const result = parseTemplates({ templates, categories, defaultView: { buildings: "building" } });
      expect(result.errors).toEqual([]);
      expect(defaultViewOf(result, "buildings")).toBe("building");
      expect(defaultViewOf(result, "streets")).toBeNull();
    });

    it("errors on an unknown template id", () => {
      const result = parseTemplates({ templates, categories, defaultView: { nope: "building" } });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('unknown template id: "nope"');
    });

    it("errors on a tag outside the template's filterableTags", () => {
      const result = parseTemplates({ templates, categories, defaultView: { buildings: "roof:shape" } });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('"roof:shape" is not in its filterableTags');
      expect(defaultViewOf(result, "buildings")).toBeNull();
    });

    it("errors on a non-map section", () => {
      const result = parseTemplates({ templates, categories, defaultView: ["building"] });
      expect(result.errors).toHaveLength(1);
    });
  });

  it("templates.yml opens buildings on the building type view", () => {
    const result = parseTemplates(loadTemplatesYaml("./prisma"));
    expect(result.templates.find((t) => t.id === "buildings")?.defaultView).toBe("building");
  });

  it("templates.yml lists valid common templates", () => {
    const result = parseTemplates(loadTemplatesYaml("./prisma"));
    expect(result.errors).toEqual([]);
    expect(result.commonTemplates).toEqual([
      "bus-stops",
      "schools",
      "clinics",
      "pharmacies",
      "buildings",
      "footways",
      "cycleways",
    ]);
  });
});
