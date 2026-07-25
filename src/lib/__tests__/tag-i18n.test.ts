// src/lib/__tests__/tag-i18n.test.ts

import { describe, it, expect } from "vitest";
import { tagLabel, tagValue, toTitleCase, type MessageResolver } from "../tag-i18n";

/**
 * Build a MessageResolver over a flat dict of dot-joined keys, e.g.
 * { "access.private": "Private", "__common__.yes": "Yes" }.
 */
const resolver = (dict: Record<string, string>): MessageResolver => {
  const fn = ((key: string) => {
    if (key in dict) return dict[key];
    throw new Error(`missing key: ${key}`);
  }) as MessageResolver;
  fn.has = (key: string) => key in dict;
  return fn;
};

describe("toTitleCase", () => {
  it("prettifies snake_case keys", () => {
    expect(toTitleCase("tactile_paving")).toBe("Tactile paving");
    expect(toTitleCase("covered")).toBe("Covered");
  });
});

describe("tagLabel", () => {
  it("returns the translated key when present", () => {
    const t = resolver({ covered: "Covered" });
    expect(tagLabel(t, "covered")).toBe("Covered");
  });

  it("falls back to title-case when the key is missing", () => {
    const t = resolver({});
    expect(tagLabel(t, "tactile_paving")).toBe("Tactile paving");
  });
});

describe("tagValue — fallback chain", () => {
  it("prefers a scoped <key>.<value> translation", () => {
    const t = resolver({
      "access.private": "Private",
      "__common__.private": "WRONG",
    });
    expect(tagValue(t, "access", "private")).toBe("Private");
  });

  it("falls back to __common__ for shared booleans", () => {
    const t = resolver({ "__common__.yes": "Yes" });
    expect(tagValue(t, "covered", "yes")).toBe("Yes");
  });

  it("falls back to the raw value (dominant casing) when unmapped", () => {
    const t = resolver({});
    expect(tagValue(t, "capacity", "12")).toBe("12");
    expect(tagValue(t, "surface", "Sett")).toBe("Sett");
  });

  it("looks up case-folded but returns the localized string", () => {
    const t = resolver({ "access.private": "Private" });
    expect(tagValue(t, "access", "PRIVATE")).toBe("Private");
  });
});
