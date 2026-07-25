import { describe, it, expect } from "vitest";
import {
  extractOsmNames,
  localeToNameKeys,
  mergeAreaNames,
  resolveAreaName,
  resolveDatasetAreaName,
  toStoredNames,
} from "@/lib/area-name";

describe("extractOsmNames", () => {
  it("pulls name:* tags into a locale-keyed map plus default", () => {
    expect(
      extractOsmNames({
        name: "東京都",
        "name:en": "Tokyo",
        "name:ja": "東京都",
        "name:pt": "Tóquio",
        population: "14000000",
      })
    ).toEqual({
      default: "東京都",
      en: "Tokyo",
      ja: "東京都",
      pt: "Tóquio",
    });
  });

  it("ignores empty values and non-name tags", () => {
    expect(extractOsmNames({ name: "  ", "name:en": "Berlin", boundary: "administrative" })).toEqual({
      en: "Berlin",
    });
  });

  it("returns {} for missing tags", () => {
    expect(extractOsmNames(undefined)).toEqual({});
    expect(extractOsmNames(null)).toEqual({});
  });
});

describe("localeToNameKeys", () => {
  it("maps pt-BR to [pt-BR, pt] (OSM uses name:pt)", () => {
    expect(localeToNameKeys("pt-BR")).toEqual(["pt-BR", "pt"]);
  });

  it("returns [locale] for locales with no mapping change", () => {
    expect(localeToNameKeys("en")).toEqual(["en"]);
    expect(localeToNameKeys("es")).toEqual(["es"]);
  });
});

describe("mergeAreaNames", () => {
  it("later maps win on key conflicts", () => {
    expect(
      mergeAreaNames({ en: "A", pt: "B" }, { en: "C", ja: "D" })
    ).toEqual({ en: "C", pt: "B", ja: "D" });
  });

  it("tolerates null/undefined", () => {
    expect(mergeAreaNames(null, { en: "X" }, undefined)).toEqual({ en: "X" });
  });
});

describe("resolveAreaName", () => {
  const area = {
    name: "東京都",
    names: { default: "東京都", en: "Tokyo", ja: "東京都", pt: "Tóquio" },
  };

  it("uses the exact locale key when present", () => {
    expect(resolveAreaName(area, "en")).toBe("Tokyo");
  });

  it("maps pt-BR to the pt tag", () => {
    expect(resolveAreaName(area, "pt-BR")).toBe("Tóquio");
  });

  it("prefers an exact pt-BR tag over pt", () => {
    const a = { name: "x", names: { "pt-BR": "São Paulo BR", pt: "São Paulo" } };
    expect(resolveAreaName(a, "pt-BR")).toBe("São Paulo BR");
  });

  it("falls back to English when the locale has no tag", () => {
    expect(resolveAreaName(area, "es")).toBe("Tokyo");
  });

  it("falls back to the OSM default when there is no name:en", () => {
    const a = { name: "x", names: { default: "東京都", pt: "Tóquio" } };
    expect(resolveAreaName(a, "en")).toBe("東京都");
  });

  it("falls back to area.name when names is missing", () => {
    expect(resolveAreaName({ name: "Fallback City" }, "en")).toBe("Fallback City");
    expect(resolveAreaName({ name: "Fallback City", names: null }, "pt-BR")).toBe(
      "Fallback City"
    );
  });
});

describe("resolveDatasetAreaName", () => {
  it("resolves from the joined area's localized names", () => {
    const dataset = {
      cityName: "München",
      area: { name: "München", names: { en: "Munich", pt: "Munique" } },
    };
    expect(resolveDatasetAreaName(dataset, "pt-BR")).toBe("Munique");
    expect(resolveDatasetAreaName(dataset, "en")).toBe("Munich");
  });

  it("falls back to cityName when the area has no name", () => {
    const dataset = { cityName: "Legacy City", area: { name: null, names: null } };
    expect(resolveDatasetAreaName(dataset, "en")).toBe("Legacy City");
  });
});

describe("toStoredNames", () => {
  it("returns the map when non-empty, undefined when empty", () => {
    expect(toStoredNames({ en: "Tokyo" })).toEqual({ en: "Tokyo" });
    expect(toStoredNames({})).toBeUndefined();
  });
});
