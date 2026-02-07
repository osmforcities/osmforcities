/**
 * Sync templates from YAML to database with soft deprecation.
 *
 * On each sync:
 * 1. Templates in YAML are upserted (created or updated)
 * 2. Templates in DB but not in YAML are marked for deprecation (deprecatesAt = now() + DEPRECATION_DAYS)
 * 3. Templates re-added to YAML have deprecatesAt cleared
 * 4. Templates past deprecation date are deleted
 *
 * Run: pnpm db:sync
 */

import { PrismaClient } from "@prisma/client";
import {
  DEPRECATION_DAYS,
  SUPPORTED_LOCALES,
  YML_LOCALE_MAP,
} from "../src/lib/constants";
import {
  loadTemplatesI18n,
  loadTemplatesYaml,
  parseTemplates,
} from "./lib/template-parser";

const prisma = new PrismaClient();

async function main() {
  console.log("Syncing templates from YAML...");

  const logicConfig = loadTemplatesYaml();
  const i18nConfig = loadTemplatesI18n();
  const result = parseTemplates(logicConfig);

  if (result.errors.length > 0) {
    console.error("Validation errors:");
    for (const err of result.errors) {
      console.error(
        `  [${err.field}] ${err.message}${err.index !== undefined ? ` (template ${err.index})` : ""}`,
      );
    }
    process.exit(1);
  }

  const yamlTemplateIds = new Set(result.templates.map((t) => t.id));

  // Get all existing templates from DB
  const existingTemplates = await prisma.template.findMany({
    select: { id: true, deprecatesAt: true },
  });

  // Find templates to deprecate (in DB but not in YAML, not already marked)
  const toDeprecate = existingTemplates.filter(
    (t) => !yamlTemplateIds.has(t.id) && t.deprecatesAt === null
  );

  // Find templates to undeprecate (back in YAML)
  const toUndeprecate = existingTemplates.filter(
    (t) => yamlTemplateIds.has(t.id) && t.deprecatesAt !== null
  );

  // Find templates to delete (past deprecation date)
  const now = new Date();
  const toDelete = existingTemplates.filter(
    (t) => t.deprecatesAt && t.deprecatesAt < now
  );

  // Delete templates past deprecation date
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map((t) => t.id);
    await prisma.template.deleteMany({
      where: { id: { in: deleteIds } },
    });
    console.log(`Deleted ${toDelete.length} templates past deprecation date`);
  }

  // Mark templates for deprecation
  if (toDeprecate.length > 0) {
    const deprecationDate = new Date(
      Date.now() + DEPRECATION_DAYS * 24 * 60 * 60 * 1000
    );
    await prisma.template.updateMany({
      where: { id: { in: toDeprecate.map((t) => t.id) } },
      data: { deprecatesAt: deprecationDate },
    });
    console.log(`Marked ${toDeprecate.length} templates for deprecation in ${DEPRECATION_DAYS} days`);
  }

  // Undeprecate templates (clear deprecatesAt)
  if (toUndeprecate.length > 0) {
    await prisma.template.updateMany({
      where: { id: { in: toUndeprecate.map((t) => t.id) } },
      data: { deprecatesAt: null },
    });
    console.log(`Undeprecated ${toUndeprecate.length} templates re-added to YAML`);
  }

  // Upsert templates from YAML
  let upserted = 0;
  for (const template of result.templates) {
    const i18n = i18nConfig?.templates?.[template.id];
    const name = i18n?.name?.en ?? template.name;
    const description = i18n?.desc?.en ?? template.description ?? null;

    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        name,
        description,
        overpassQuery: template.overpassQuery,
        category: template.category,
        tags: template.tags,
        updatedAt: new Date(),
      },
      create: {
        id: template.id,
        name,
        description,
        overpassQuery: template.overpassQuery,
        category: template.category,
        tags: template.tags,
      },
    });
    upserted++;

    // Upsert translations
    for (const locale of SUPPORTED_LOCALES) {
      const ymlLocale = YML_LOCALE_MAP[locale] ?? locale;
      const translatedName = i18n?.name?.[ymlLocale] ?? name;
      const translatedDesc =
        i18n?.desc?.[ymlLocale] ?? (locale === "en" ? description : null);

      await prisma.templateTranslation.upsert({
        where: {
          templateId_locale: {
            templateId: template.id,
            locale,
          },
        },
        update: {
          name: translatedName,
          description: translatedDesc,
        },
        create: {
          templateId: template.id,
          locale,
          name: translatedName,
          description: translatedDesc,
        },
      });
    }
  }

  console.log(`Upserted ${upserted} templates from YAML`);
  console.log("Sync complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
