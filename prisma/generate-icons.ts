/**
 * Generate category-icons.tsx from templates.yml.
 *
 * Run with: pnpm generate-icons
 *
 * Reads templates.yml and generates:
 * - getCategoryIcon: category slug -> icon (from the categories section only)
 * - getTemplateIcon: template slug -> icon, falling back to getCategoryIcon
 *
 * All icon names are validated against lucide-react exports; generation
 * fails listing any unknown names.
 */

import {
  loadTemplatesYaml,
  collectCategoryIcons,
  collectTemplateIcons,
} from "./lib/template-parser";
import { writeFileSync } from "fs";
import { join } from "path";
import * as lucide from "lucide-react";

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
 * Main generation function
 */
function generateIcons(): void {
  try {
    const { content, categoryIcons, templateIcons } =
      generateIconsFileContent();
    writeIconsFile(content);
    console.log(
      `Generated src/lib/category-icons.tsx with ${categoryIcons.size} category and ${templateIcons.size} template mappings`,
    );
  } catch (error) {
    console.error("Failed to generate icons:", error);
    process.exit(1);
  }
}

generateIcons();
