#!/usr/bin/env tsx
// Usage:
//   pnpm i18n:review              — list sections with key/flagged counts
//   pnpm i18n:review <Section>    — print all keys in that section

import { readFileSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(__dirname, "../messages");
const LOCALES = ["pt-BR", "es"] as const;

// Words allowed to appear unchanged in any translation (proper nouns, tech terms)
const ALLOWED = new Set([
  "email",
  "spam",
  "online",
  "openstreetmap",
  "osm",
  "feed",
  "dashboard",
  "download",
]);

function flatten(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[path] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    }
  }
  return result;
}

// Returns English words that appear verbatim in the translation (possible anglicisms).
// Skips short words, capitalized words (proper nouns), and known allowed terms.
function detectAnglicisms(enValue: string, translated: string): string[] {
  const translatedLower = translated.toLowerCase();
  return enValue
    .split(/\s+/)
    .filter((word) => {
      const clean = word.replace(/[^a-zA-Z]/g, "");
      if (clean.length < 5) return false;
      if (clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()) return false; // proper noun
      if (ALLOWED.has(clean.toLowerCase())) return false;
      return translatedLower.includes(clean.toLowerCase());
    })
    .map((w) => w.replace(/[^a-zA-Z]/g, ""));
}

function loadMessages() {
  const en = flatten(
    JSON.parse(readFileSync(join(MESSAGES_DIR, "en.json"), "utf-8"))
  );
  const locales: Record<string, Record<string, string>> = {};
  for (const locale of LOCALES) {
    locales[locale] = flatten(
      JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf-8"))
    );
  }
  return { en, locales };
}

function groupBySection(keys: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  for (const key of keys) {
    const section = key.split(".")[0];
    if (!sections[section]) sections[section] = [];
    sections[section].push(key);
  }
  return sections;
}

function countFlagged(
  keys: string[],
  en: Record<string, string>,
  locales: Record<string, Record<string, string>>
): number {
  let count = 0;
  for (const key of keys) {
    for (const locale of LOCALES) {
      const translated = locales[locale][key];
      if (translated && detectAnglicisms(en[key], translated).length > 0) {
        count++;
        break;
      }
    }
  }
  return count;
}

function printSectionList(
  sections: Record<string, string[]>,
  en: Record<string, string>,
  locales: Record<string, Record<string, string>>
) {
  console.log("Sections:\n");
  for (const [section, keys] of Object.entries(sections)) {
    const flagged = countFlagged(keys, en, locales);
    const flag = flagged > 0 ? `  ⚠ ${flagged} flagged` : "";
    console.log(`  ${section.padEnd(32)} ${String(keys.length).padStart(3)} keys${flag}`);
  }
  console.log(`\nUsage: pnpm i18n:review <Section>`);
}

function printSection(
  section: string,
  keys: string[],
  en: Record<string, string>,
  locales: Record<string, Record<string, string>>
) {
  const flaggedCount = countFlagged(keys, en, locales);
  console.log(`\n=== ${section} (${keys.length} keys${flaggedCount > 0 ? `, ⚠ ${flaggedCount} flagged` : ""}) ===\n`);

  for (const key of keys) {
    const enValue = en[key];
    const lines: string[] = [`${key}`];
    lines.push(`  EN:    ${enValue}`);
    for (const locale of LOCALES) {
      const translated = locales[locale][key] ?? "(missing)";
      const anglicisms = detectAnglicisms(enValue, translated);
      const flag = anglicisms.length > 0 ? `   ⚠ "${anglicisms.join('", "')}"` : "";
      lines.push(`  ${locale.padEnd(6)} ${translated}${flag}`);
    }
    console.log(lines.join("\n"));
    console.log("---");
  }
}

function main() {
  const { en, locales } = loadMessages();
  const sections = groupBySection(Object.keys(en));
  const requestedSection = process.argv[2];

  if (!requestedSection) {
    printSectionList(sections, en, locales);
    return;
  }

  const keys = sections[requestedSection];
  if (!keys) {
    console.error(
      `Section "${requestedSection}" not found.\nAvailable: ${Object.keys(sections).join(", ")}`
    );
    process.exit(1);
  }

  printSection(requestedSection, keys, en, locales);
}

main();
