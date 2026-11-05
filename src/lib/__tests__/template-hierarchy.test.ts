import { describe, it, expect } from "vitest";
import { resolveTemplateHierarchy } from "../template-hierarchy";

const relative = (id: string, name: string, ptName?: string) => ({
  id,
  name,
  description: null,
  translations: ptName ? [{ locale: "pt-BR", name: ptName, description: null }] : [],
});

const activeParent = {
  ...relative("public-transit", "Public transit", "Transporte público"),
  isActive: true,
  deprecatesAt: null,
};

describe("resolveTemplateHierarchy", () => {
  it("names the parent in the reader's language", () => {
    const result = resolveTemplateHierarchy(
      { id: "tram-stops", parent: activeParent, children: [] },
      "pt-BR"
    );
    expect(result.parent).toEqual({ id: "public-transit", name: "Transporte público" });
  });

  it("drops an inactive or deprecated parent", () => {
    const inactive = resolveTemplateHierarchy(
      { id: "tram-stops", parent: { ...activeParent, isActive: false }, children: [] },
      "en"
    );
    const deprecated = resolveTemplateHierarchy(
      { id: "tram-stops", parent: { ...activeParent, deprecatesAt: new Date() }, children: [] },
      "en"
    );
    expect(inactive.parent).toBeNull();
    expect(deprecated.parent).toBeNull();
  });

  it("sorts children A to Z by translated name", () => {
    const result = resolveTemplateHierarchy(
      {
        id: "public-transit",
        parent: null,
        children: [
          relative("tram-stops", "Tram stops", "Paradas de bonde"),
          relative("bus-stops", "Bus stops", "Pontos de ônibus"),
          relative("railway-stations", "Railway stations", "Estações ferroviárias"),
        ],
      },
      "pt-BR"
    );
    expect(result.children.map((c) => c.name)).toEqual([
      "Estações ferroviárias",
      "Paradas de bonde",
      "Pontos de ônibus",
    ]);
  });

  it("keeps the other template fields", () => {
    const result = resolveTemplateHierarchy(
      { id: "tram-stops", name: "Tram stops", parent: null, children: [] },
      "en"
    );
    expect(result).toEqual({ id: "tram-stops", name: "Tram stops", parent: null, children: [] });
  });
});
