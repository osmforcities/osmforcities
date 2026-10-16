/**
 * Generate category-icons.tsx from templates.yml.
 *
 * Run with: pnpm generate-icons
 *
 * Reads templates.yml and generates:
 * - getCategoryIcon: category slug -> icon (from the categories section only)
 * - getTemplateIcon: template slug -> icon, falling back to getCategoryIcon
 * - public/email-icons: PNG tiles per template and UI glyphs for emails
 *
 * All icon names are validated against lucide-react exports; generation
 * fails listing any unknown names.
 */

import {
  loadTemplatesYaml,
  collectCategoryIcons,
  collectTemplateIcons,
} from "./lib/template-parser";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import * as lucide from "lucide-react";
import { EMAIL_GLYPHS, EMAIL_ICON_DIR, EMAIL_REMOVED_TEMPLATE_ICON } from "../src/lib/email-layout";
import { renderGlyph, renderTemplateTile } from "./lib/email-icon-render";

const FALLBACK_ICON = "MapPin";

/**
 * Fail generation if any icon name is not a lucide-react export
 */
function validateIconNames(icons: Set<string>): void {
  const unknown = Array.from(icons).filter((name) => !(name in lucide));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown lucide-react icon name(s) in templates.yml: ${unknown.join(", ")}`,
    );
  }
}

/**
 * Build the import statement for lucide-react
 */
function buildImportStatement(icons: Set<string>): string {
  const sortedIcons = Array.from(icons).sort();
  return `import {
  ${sortedIcons.join(",\n  ")}
} from "lucide-react";`;
}

/**
 * Build switch cases mapping keys to icon JSX
 */
function buildSwitchCases(icons: Map<string, string>): string {
  return Array.from(icons.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, icon]) => {
      const lowerKey = key.toLowerCase();
      return `    case "${lowerKey}":
      return <${icon} className="w-5 h-5" />;`;
    })
    .join("\n");
}

/**
 * Generate the full category-icons.tsx file content
 */
function generateIconsFileContent(): {
  content: string;
  categoryIcons: Map<string, string>;
  templateIcons: Map<string, string>;
} {
  const config = loadTemplatesYaml();
  const categoryIcons = collectCategoryIcons(config);
  const templateIcons = collectTemplateIcons(config);

  const usedIcons = new Set<string>([
    ...categoryIcons.values(),
    ...templateIcons.values(),
    FALLBACK_ICON,
  ]);
  validateIconNames(usedIcons);

  const importStatement = buildImportStatement(usedIcons);
  const categoryCases = buildSwitchCases(categoryIcons);
  const templateCases = buildSwitchCases(templateIcons);
  const timestamp = new Date().toISOString();

  const content = `${importStatement}

/**
 * Icon lookups for dataset templates and categories
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: ${timestamp}
 * Regenerate with: pnpm generate-icons
 */

/**
 * Get the icon for a category (case-insensitive)
 *
 * @example
 * getCategoryIcon("education"); // Returns School icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
${categoryCases}
    default:
      return <${FALLBACK_ICON} className="w-5 h-5" />;
  }
}

/**
 * Get the icon for a template (case-insensitive template slug),
 * falling back to the template's category icon
 *
 * @example
 * getTemplateIcon("drinking-water", "amenities"); // Returns Droplet icon
 */
export function getTemplateIcon(templateId: string, category: string) {
  switch (templateId.toLowerCase()) {
${templateCases}
    default:
      return getCategoryIcon(category);
  }
}
`;

  return { content, categoryIcons, templateIcons };
}

/**
 * Write generated file to disk
 */
function writeIconsFile(content: string): void {
  const outputPath = join(__dirname, "../src/lib/category-icons.tsx");
  writeFileSync(outputPath, content, "utf8");
}

/**
 * Write the email PNGs: one tile per template (its icon, else its category's),
 * the UI glyphs, and the neutral tile report rows use for removed templates.
 */
async function writeEmailIcons(
  categoryIcons: Map<string, string>,
  templateIcons: Map<string, string>,
): Promise<void> {
  const outDir = join(__dirname, "../public", EMAIL_ICON_DIR);
  mkdirSync(outDir, { recursive: true });
  const { templates } = loadTemplatesYaml();
  for (const [id, template] of Object.entries(templates)) {
    const iconName =
      templateIcons.get(id) ?? categoryIcons.get(template.category) ?? FALLBACK_ICON;
    writeFileSync(join(outDir, `${id}.png`), await renderTemplateTile(iconName));
  }
  for (const [name, { icon, color }] of Object.entries(EMAIL_GLYPHS)) {
    writeFileSync(join(outDir, `glyph-${name}.png`), await renderGlyph(icon, color));
  }
  writeFileSync(
    join(outDir, `${EMAIL_REMOVED_TEMPLATE_ICON}.png`),
    await renderTemplateTile(FALLBACK_ICON),
  );
  console.log(`Generated public/${EMAIL_ICON_DIR} with ${Object.keys(templates).length} template tiles`);
}

/**
 * Main generation function
 */
async function generateIcons(): Promise<void> {
  try {
    const { content, categoryIcons, templateIcons } =
      generateIconsFileContent();
    writeIconsFile(content);
    console.log(
      `Generated src/lib/category-icons.tsx with ${categoryIcons.size} category and ${templateIcons.size} template mappings`,
    );
    await writeEmailIcons(categoryIcons, templateIcons);
  } catch (error) {
    console.error("Failed to generate icons:", error);
    process.exit(1);
  }
}

void generateIcons();
