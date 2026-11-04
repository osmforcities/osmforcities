import { describe, expect, it } from "vitest";
import type { AreaTemplate } from "@/lib/area-templates";
import { createTemplateSearch } from "@/lib/template-search";

const tpl = (
  id: string,
  name: string,
  englishName: string,
  osmTags: string[],
  over: Partial<AreaTemplate> = {}
): AreaTemplate => ({
  id,
  name,
  description: null,
  categorySlug: "bus",
  topicSlug: "mobility",
  commonRank: null,
  englishName,
  osmTags,
  ...over,
});

const templates = [
  tpl("bus-stops", "Pontos de ônibus", "Bus Stops", ["highway=bus_stop"]),
  tpl("bus-lanes", "Faixas de ônibus", "Bus Lanes", ["busway=lane"]),
  tpl("bicycle-parking", "Estacionamento para bicicletas", "Bicycle Parking", [
    "amenity=bicycle_parking",
  ], { categorySlug: "cycling" }),
  tpl("bakeries", "Padarias", "Bakeries", ["shop=bakery"], {
    categorySlug: "food",
    topicSlug: "food-drink",
  }),
  tpl("platforms", "Plataformas", "Platforms", ["highway=bus_stop"], {
    categorySlug: "transit",
  }),
  tpl("transit-shelters", "Abrigos", "Shelters", ["shelter_type=public_transport"], {
    description: "Abrigos em pontos de ônibus",
  }),
];
const labels: Record<string, string> = {
  bus: "Ônibus",
  cycling: "Ciclismo",
  mobility: "Mobilidade",
  food: "Comida",
  "food-drink": "Comida e bebida",
};
const search = createTemplateSearch(templates, (slug) => labels[slug] ?? slug);
const ids = (query: string) => search(query).map((template) => template.id);

describe("createTemplateSearch", () => {
  it("ignores accents", () => {
    expect(ids("onibus")).toContain("bus-stops");
  });

  it("tolerates typos", () => {
    expect(ids("bicicleat")).toEqual(["bicycle-parking"]);
  });

  it("matches the English name", () => {
    expect(ids("bakery")).toContain("bakeries");
  });

  it("matches OSM tags", () => {
    expect(ids("shop=bakery")).toEqual(["bakeries"]);
  });

  it("matches category labels", () => {
    expect(ids("ciclismo")).toEqual(["bicycle-parking"]);
  });

  it("accepts words in any order, and every word must match", () => {
    expect(ids("onibus pontos")[0]).toBe("bus-stops");
    expect(ids("pontos padarias")).toEqual([]);
  });

  it("ranks name matches above description matches", () => {
    const results = ids("pontos");
    expect(results.indexOf("bus-stops")).toBeLessThan(results.indexOf("transit-shelters"));
  });

  it("ranks name matches above tag matches", () => {
    const results = ids("bus");
    expect(results).toContain("platforms");
    expect(results.indexOf("bus-lanes")).toBeLessThan(results.indexOf("platforms"));
  });

  it("returns nothing for a blank query", () => {
    expect(ids("  ")).toEqual([]);
  });
});
