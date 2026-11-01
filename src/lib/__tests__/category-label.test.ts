import { describe, it, expect } from "vitest";
import enMessages from "../../../messages/en.json";
import { loadTemplatesYaml, parseTemplates } from "../../../prisma/lib/template-parser";
import { categoryLabel } from "../category-label";
import type { MessageResolver } from "../tag-i18n";

const resolver = (messages: Record<string, string>): MessageResolver =>
  Object.assign((key: string) => messages[key], {
    has: (key: string) => key in messages,
  });

describe("categoryLabel", () => {
  it("uses the message when one exists", () => {
    expect(categoryLabel(resolver({ bus: "Bus" }), "bus")).toBe("Bus");
  });

  it("falls back to title case", () => {
    expect(categoryLabel(resolver({}), "roads-streets")).toBe("Roads Streets");
  });

  it("has an English label for every category in templates.yml", () => {
    const { categories } = parseTemplates(loadTemplatesYaml("./prisma"));
    const labels = enMessages.CategoryLabel as Record<string, string>;
    const missing = categories.map((c) => c.slug).filter((slug) => !(slug in labels));
    expect(missing).toEqual([]);
  });
});
