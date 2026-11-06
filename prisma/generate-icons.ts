/**
 * Generate category-icons.tsx from templates.yml.
 *
 * Run with: pnpm generate-icons
 *
 * Reads templates.yml and generates:
 * - getCategoryIcon: category slug -> Lucide icon (from the categories section only)
 * - getTemplateIcon: template slug -> Pinhead icon, falling back to getCategoryIcon
 * - public/template-icons: the Pinhead sprite getTemplateIcon points at
 * - public/email-icons: PNG tiles per template and UI glyphs for emails
 *
 * Category icons must be lucide-react exports. Every template must name a
 * Pinhead icon. Generation fails listing any offending names.
 */

import {
  loadTemplatesYaml,
  collectCategoryIcons,
  collectTemplateIcons,
} from "./lib/template-parser";
import { createHash } from "crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import * as lucide from "lucide-react";
import { EMAIL_GLYPHS, EMAIL_ICON_DIR, EMAIL_REMOVED_TEMPLATE_ICON } from "../src/lib/email-layout";
import { renderGlyph, renderTemplateTile } from "./lib/email-icon-render";
import { PINHEAD_VIEWBOX, readPinheadPaths, templateIconErrors } from "./lib/pinhead";

const FALLBACK_ICON = "MapPin";
const REMOVED_TEMPLATE_PINHEAD_ICON = "map_pin";
const TEMPLATE_ICON_DIR = "template-icons";

function validateLucideNames(icons: Set<string>): void {
  const unknown = Array.from(icons).filter((name) => !(name in lucide));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown lucide-react icon name(s) in templates.yml categories: ${unknown.join(", ")}`,
    );
  }
}

function buildImportStatement(icons: Set<string>): string {
  const sortedIcons = Array.from(icons).sort();
  return `import {
  ${sortedIcons.join(",\n  ")}
} from "lucide-react";`;
}

function buildCategoryCases(icons: Map<string, string>): string {
  return Array.from(icons.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([slug, icon]) => `    case "${slug.toLowerCase()}":
      return <${icon} className="w-5 h-5" />;`,
    )
    .join("\n");
}

function buildTemplateEntries(icons: Map<string, string>): string {
  return Array.from(icons.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, icon]) => `  ["${id.toLowerCase()}", "${icon}"],`)
    .join("\n");
}

/** One <symbol> per Pinhead icon, named after the content hash so it can be cached forever. */
function writeTemplateIconSprite(icons: Map<string, string>): string {
  const symbols = Array.from(new Set(icons.values()))
    .sort()
    .map((icon) => {
      const paths = readPinheadPaths(icon).map((d) => `<path d="${d}"/>`).join("");
      return `<symbol id="${icon}" viewBox="${PINHEAD_VIEWBOX}">${paths}</symbol>`;
    });
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>\n`;
  const fileName = `${createHash("sha256").update(sprite).digest("hex").slice(0, 12)}.svg`;

  const outDir = join(__dirname, "../public", TEMPLATE_ICON_DIR);
  mkdirSync(outDir, { recursive: true });
  for (const stale of readdirSync(outDir).filter((file) => file !== fileName)) {
    rmSync(join(outDir, stale));
  }
  writeFileSync(join(outDir, fileName), sprite);
  return `/${TEMPLATE_ICON_DIR}/${fileName}`;
}

function generateIconsFileContent(): {
  content: string;
  templateIcons: Map<string, string>;
} {
  const config = loadTemplatesYaml();
  const categoryIcons = collectCategoryIcons(config);
  const templateIcons = collectTemplateIcons(config);

  const lucideIcons = new Set<string>([...categoryIcons.values(), FALLBACK_ICON]);
  validateLucideNames(lucideIcons);
  const errors = templateIconErrors(Object.keys(config.templates), templateIcons);
  if (errors.length > 0) {
    throw new Error(`Template icons in templates.yml must be Pinhead ids:\n${errors.join("\n")}`);
  }

  const spriteUrl = writeTemplateIconSprite(templateIcons);
  const timestamp = new Date().toISOString();

  const content = `${buildImportStatement(lucideIcons)}

/**
 * Icon lookups for dataset templates and categories
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: ${timestamp}
 * Regenerate with: pnpm generate-icons
 */

/**
 * Template icons are Pinhead map icons (CC0, https://pinhead.ink) in one
 * static sprite, so their paths stay out of the client bundle.
 */
const TEMPLATE_ICON_SPRITE = "${spriteUrl}";

const TEMPLATE_ICONS = new Map<string, string>([
${buildTemplateEntries(templateIcons)}
]);

/**
 * Get the icon for a category (case-insensitive)
 *
 * @example
 * getCategoryIcon("education"); // Returns School icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
${buildCategoryCases(categoryIcons)}
    default:
      return <${FALLBACK_ICON} className="w-5 h-5" />;
  }
}

/**
 * Get the icon for a template (case-insensitive template slug),
 * falling back to the template's category icon
 *
 * @example
 * getTemplateIcon("drinking-water", "amenities"); // Returns the water tap icon
 */
export function getTemplateIcon(templateId: string, category: string) {
  const icon = TEMPLATE_ICONS.get(templateId.toLowerCase());
  if (!icon) return getCategoryIcon(category);
  return (
    <svg viewBox="${PINHEAD_VIEWBOX}" fill="currentColor" aria-hidden="true" className="w-5 h-5">
      <use href={\`\${TEMPLATE_ICON_SPRITE}#\${icon}\`} />
    </svg>
  );
}
`;

  return { content, templateIcons };
}

function writeIconsFile(content: string): void {
  const outputPath = join(__dirname, "../src/lib/category-icons.tsx");
  writeFileSync(outputPath, content, "utf8");
}

/**
 * Write the email PNGs: one tile per template, the UI glyphs, and the
 * neutral tile report rows use for removed templates.
 */
async function writeEmailIcons(templateIcons: Map<string, string>): Promise<void> {
  const outDir = join(__dirname, "../public", EMAIL_ICON_DIR);
  mkdirSync(outDir, { recursive: true });
  for (const [id, icon] of templateIcons) {
    writeFileSync(join(outDir, `${id}.png`), await renderTemplateTile(readPinheadPaths(icon)));
  }
  for (const [name, { icon, color }] of Object.entries(EMAIL_GLYPHS)) {
    writeFileSync(join(outDir, `glyph-${name}.png`), await renderGlyph(icon, color));
  }
  writeFileSync(
    join(outDir, `${EMAIL_REMOVED_TEMPLATE_ICON}.png`),
    await renderTemplateTile(readPinheadPaths(REMOVED_TEMPLATE_PINHEAD_ICON)),
  );
  console.log(`Generated public/${EMAIL_ICON_DIR} with ${templateIcons.size} template tiles`);
}

async function generateIcons(): Promise<void> {
  try {
    const { content, templateIcons } = generateIconsFileContent();
    writeIconsFile(content);
    console.log(`Generated src/lib/category-icons.tsx with ${templateIcons.size} template icons`);
    await writeEmailIcons(templateIcons);
  } catch (error) {
    console.error("Failed to generate icons:", error);
    process.exit(1);
  }
}

void generateIcons();
