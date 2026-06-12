import { describe, it, expect } from "vitest";
import { transformDataset } from "../dataset/transform";

const baseRaw = {
  id: "ds-1",
  cityName: "Berlin",
  isActive: true,
  lastChecked: null,
  dataCount: 0,
  stats: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  geojson: null,
  bbox: null,
  template: {
    id: "tpl-1",
    name: "Schools",
    description: null,
    translations: [],
    category: { id: "cat-1", name: "Education", slug: "education" },
  },
  user: null,
  area: {
    id: 1,
    name: "Berlin",
    countryCode: "DE",
    bounds: null,
    geojson: null,
  },
};

describe("transformDataset", () => {
  it("parses successfully when template.category has id, name, slug", () => {
    expect(() => transformDataset(baseRaw, null, "en")).not.toThrow();
  });

  it("parses successfully when template.category is null", () => {
    const raw = { ...baseRaw, template: { ...baseRaw.template, category: null } };
    expect(() => transformDataset(raw, null, "en")).not.toThrow();
  });

  it("throws when template.category is missing id/name (under-fetched select)", () => {
    const raw = {
      ...baseRaw,
      template: {
        ...baseRaw.template,
        category: { slug: "education" } as unknown as typeof baseRaw.template.category,
      },
    };
    expect(() => transformDataset(raw, null, "en")).toThrow();
  });
});
