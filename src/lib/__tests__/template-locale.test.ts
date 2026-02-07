import { describe, it, expect } from "vitest";
import { resolveTemplateForLocale, mapAppLocaleToDb } from "../template-locale";

describe("template-locale", () => {
  describe("mapAppLocaleToDb", () => {
    it("maps app locale to db locale directly", () => {
      expect(mapAppLocaleToDb("en")).toBe("en");
      expect(mapAppLocaleToDb("pt-BR")).toBe("pt-BR");
      expect(mapAppLocaleToDb("es")).toBe("es");
    });
  });

  describe("resolveTemplateForLocale", () => {
    const mockTemplate = {
      id: "bicycle-parking",
      name: "Bicycle Parking",
      description: "Bicycle Parking in the area",
      category: "transportation",
      tags: ["amenity=bicycle_parking"],
      translations: [
        {
          locale: "pt-BR",
          name: "Estacionamento para bicicletas",
          description: "Estacionamento para bicicletas na área",
        },
        {
          locale: "es",
          name: "Estacionamiento de bicicletas",
          description: "Estacionamiento de bicicletas en el área",
        },
      ],
    };

    it("returns translated name when translation exists", () => {
      const result = resolveTemplateForLocale(mockTemplate, "pt-BR");
      expect(result.name).toBe("Estacionamento para bicicletas");
    });

    it("returns translated description when available", () => {
      const result = resolveTemplateForLocale(mockTemplate, "es");
      expect(result.description).toBe("Estacionamiento de bicicletas en el área");
    });

    it("falls back to default name when translation missing", () => {
      const result = resolveTemplateForLocale(mockTemplate, "fr");
      expect(result.name).toBe("Bicycle Parking");
    });

    it("falls back to default description when translation missing", () => {
      const result = resolveTemplateForLocale(mockTemplate, "de");
      expect(result.description).toBe("Bicycle Parking in the area");
    });

    it("handles missing translations array", () => {
      const noTranslations = {
        id: "atm",
        name: "ATM",
        description: "ATM locations",
        translations: [],
      };
      const result = resolveTemplateForLocale(noTranslations, "pt-BR");
      expect(result.name).toBe("ATM");
      expect(result.description).toBe("ATM locations");
    });

    it("handles undefined translations", () => {
      const noTranslationsField = {
        id: "atm",
        name: "ATM",
        description: "ATM locations",
        translations: undefined,
      } as unknown as typeof mockTemplate;
      const result = resolveTemplateForLocale(noTranslationsField, "pt-BR");
      expect(result.name).toBe("ATM");
      expect(result.description).toBe("ATM locations");
    });

    it("returns null for description when template description is null", () => {
      const nullDescription = {
        id: "test",
        name: "Test",
        description: null,
        translations: [],
      };
      const result = resolveTemplateForLocale(nullDescription, "en");
      expect(result.description).toBeNull();
    });

    it("preserves other template fields", () => {
      const result = resolveTemplateForLocale(mockTemplate, "pt-BR");
      expect(result.id).toBe("bicycle-parking");
      expect(result.category).toBe("transportation");
      expect(result.tags).toEqual(["amenity=bicycle_parking"]);
    });

    it("excludes translations from result", () => {
      const result = resolveTemplateForLocale(mockTemplate, "en");
      expect("translations" in result).toBe(false);
    });
  });
});
