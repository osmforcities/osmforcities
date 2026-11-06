import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { collectTemplateIcons, loadTemplatesYaml } from "../template-parser";
import { isPinheadIcon, readPinheadPaths, templateIconErrors } from "../pinhead";

describe("templateIconErrors", () => {
  it("accepts Pinhead ids", () => {
    expect(templateIconErrors(["benches"], new Map([["benches", "bench_with_backrest"]]))).toEqual([]);
  });

  it("lists templates with no icon or a non-Pinhead icon", () => {
    const icons = new Map([
      ["benches", "RockingChair"],
      ["bridges", "../../package"],
    ]);
    expect(templateIconErrors(["benches", "bridges", "silos"], icons)).toEqual([
      'benches: unknown Pinhead icon "RockingChair"',
      'bridges: unknown Pinhead icon "../../package"',
      "silos: no icon",
    ]);
  });
});

describe("readPinheadPaths", () => {
  it("returns the path data of an icon", () => {
    const paths = readPinheadPaths("bench_with_backrest");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((d) => d.startsWith("M"))).toBe(true);
  });

  it("throws on an unknown id", () => {
    expect(isPinheadIcon("not_an_icon")).toBe(false);
    expect(() => readPinheadPaths("not_an_icon")).toThrow("Unknown Pinhead icon: not_an_icon");
  });
});

describe("template icon sprite", () => {
  it("has a symbol for every catalog template icon (run pnpm generate-icons)", () => {
    const spriteDir = join(__dirname, "../../../public/template-icons");
    const [sprite, ...extra] = readdirSync(spriteDir);
    expect(extra).toEqual([]);
    const svg = readFileSync(join(spriteDir, sprite), "utf8");
    const icons = new Set(collectTemplateIcons(loadTemplatesYaml()).values());
    expect([...icons].filter((icon) => !svg.includes(`<symbol id="${icon}"`))).toEqual([]);
  });
});
