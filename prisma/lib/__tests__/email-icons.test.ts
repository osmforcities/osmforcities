import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { loadTemplatesYaml } from "../template-parser";
import { EMAIL_GLYPHS, EMAIL_ICON_DIR, EMAIL_REMOVED_TEMPLATE_ICON } from "../../../src/lib/email-layout";

const iconDir = join(__dirname, "../../../public", EMAIL_ICON_DIR);
const missing = (names: string[]) => names.filter((name) => !existsSync(join(iconDir, `${name}.png`)));

describe("email icon PNGs", () => {
  it("has a tile for every catalog template (run pnpm generate-icons)", () => {
    expect(missing(Object.keys(loadTemplatesYaml().templates))).toEqual([]);
  });

  it("has every UI glyph and the removed-template tile (run pnpm generate-icons)", () => {
    expect(
      missing([...Object.keys(EMAIL_GLYPHS).map((glyph) => `glyph-${glyph}`), EMAIL_REMOVED_TEMPLATE_ICON])
    ).toEqual([]);
  });
});
