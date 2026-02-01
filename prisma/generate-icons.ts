/**
 * Generate category-icons.tsx from templates.yml.
 *
 * Run with: pnpm generate-icons
 *
 * This script reads templates.yml and generates a getCategoryIcon function
 * that maps category names to Lucide React icon components.
 */

import { loadTemplatesYaml, collectIcons } from "./lib/template-parser";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Get all unique icon names used in templates
 */
function getUsedIconNames(
  config: ReturnType<typeof loadTemplatesYaml>,
): Set<string> {
  const iconMap = collectIcons(config);
  const icons = new Set<string>(Array.from(iconMap.values()));

  // Always include MapPin as fallback
  icons.add("MapPin");

  return icons;
}

/**
 * Build the import statement for lucide-react
 */
function buildImportStatement(icons: Set<string>): string {
  const sortedIcons = Array.from(icons).sort();

  if (sortedIcons.length === 0) {
    return `import { MapPin } from "lucide-react";`;
  }

  return `import {
  ${sortedIcons.join(",\n  ")}
} from "lucide-react";`;
}

/**
 * Build switch case for getCategoryIcon function
 */
function buildCategorySwitch(icons: Map<string, string>): string {
  const cases = Array.from(icons.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, icon]) => {
      const lowerCat = category.toLowerCase();
      const jsx = `<${icon} className="w-5 h-5" />`;
      return `    case "${lowerCat}":
      return ${jsx};`;
    });

  return cases.join("\n");
}

/**
 * Generate the full category-icons.tsx file content
 */
function generateIconsFileContent(): {
  content: string;
  icons: Map<string, string>;
} {
  const config = loadTemplatesYaml();
  const iconMap = collectIcons(config);

  const importStatement = buildImportStatement(getUsedIconNames(config));
  const switchCases = buildCategorySwitch(iconMap);
  const timestamp = new Date().toISOString();

  const content = `${importStatement}

/**
 * Get appropriate icon for a category
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: ${timestamp}
 * Regenerate with: pnpm generate-icons
 *
 * @param category - Category name (case-insensitive)
 * @returns React component for the category icon
 * @example
 * const icon = getCategoryIcon("education"); // Returns School icon
 * const icon = getCategoryIcon("HEALTHCARE"); // Returns Hospital icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
${switchCases}
    default:
      return <MapPin className="w-5 h-5" />;
  }
}
`;

  return { content, icons: iconMap };
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
    const { content, icons } = generateIconsFileContent();
    writeIconsFile(content);
    console.log(
      `Generated src/lib/category-icons.tsx with ${icons.size} category mappings`,
    );
  } catch (error) {
    console.error("Failed to generate icons:", error);
    process.exit(1);
  }
}

generateIcons();
