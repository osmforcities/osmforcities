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
} from "../template-parser";

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
    it("builds query for key=value", () => {
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
      expect(query).toContain('node["sport"="football"]');
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
  });

  describe("loadTemplatesLogic", () => {
    it("loads templates.yml array format and returns entries + categories", () => {
      const { entries, categories } = loadTemplatesLogic("./prisma");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0]).toEqual({
        id: "bicycle-parking",
        query: "amenity=bicycle_parking",
        category: "transportation",
        icon: "Bike",
      });
      expect(categories.transportation).toBe("Car");
      expect(categories.agriculture).toBe("Wheat");
    });
  });

  describe("loadTemplatesI18n", () => {
    it("loads templates.i18n.yml and returns keyed name/desc per id", () => {
      const config = loadTemplatesI18n("./prisma");
      expect(config.templates["bicycle-parking"]).toBeDefined();
      expect(config.templates["bicycle-parking"].name.en).toBe(
        "Bicycle Parking",
      );
      expect(config.templates["bicycle-parking"].desc.en).toBeDefined();
      expect(config.templates["bicycle-parking"].name.pt).toBeDefined();
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
  });
});
