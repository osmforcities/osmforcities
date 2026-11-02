/**
 * Sync templates from YAML to database with soft deprecation.
 *
 * On each sync:
 * 1. Templates in YAML are upserted (created or updated)
 * 2. Templates in DB but not in YAML are marked for deprecation (deprecatesAt = now() + DEPRECATION_DAYS)
 * 3. Templates re-added to YAML have deprecatesAt cleared
 * 4. Templates past deprecation date are deleted
 * 5. The category tree is upserted; undeclared categories holding no
 *    templates are pruned (ones still holding a deprecated template stay)
 * 6. Deprecated templates listed under `replacedBy` point to their replacement
 *
 * Run: pnpm db:sync
 */

import { PrismaClient } from "@prisma/client";
import { DEPRECATION_DAYS, YML_LOCALE_MAP } from "../src/lib/constants";
import { AVAILABLE_LOCALES } from "../src/i18n/constants";
import {
  loadTemplatesI18n,
  loadTemplatesYaml,
  parseTemplates,
  type ParsedCategory,
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

  const categoryMap = await syncCategories(result.categories);

  // Cached size-check verdicts are keyed by area+template only; a changed
  // query must not stay blocked by a verdict computed for the old query
  const existingQueries = new Map(
    (
      await prisma.template.findMany({
        select: { id: true, overpassQuery: true },
      })
    ).map((t) => [t.id, t.overpassQuery])
  );
  const changedQueryIds = result.templates
    .filter((t) => {
      const existing = existingQueries.get(t.id);
      return existing !== undefined && existing !== t.overpassQuery;
    })
    .map((t) => t.id);
  if (changedQueryIds.length > 0) {
    const { count } = await prisma.areaSizeCheck.deleteMany({
      where: { templateId: { in: changedQueryIds } },
    });
    console.log(
      `Invalidated ${count} size-check verdicts for ${changedQueryIds.length} templates with changed queries`
    );
  }

  // Upsert templates from YAML
  // Pass 1: upsert all templates without parent (ensures parents exist first)
  let upserted = 0;
  for (const template of result.templates) {
    const i18n = i18nConfig?.templates?.[template.id];
    const name = i18n?.name?.en ?? template.name;
    const description = i18n?.desc?.en ?? template.description ?? null;

    // parseTemplates rejects undeclared categories, so the lookup always hits
    const categoryId = categoryMap.get(template.category)!;

    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        name,
        description,
        overpassQuery: template.overpassQuery,
        category: { connect: { id: categoryId } },
        tags: template.tags,
        filterableTags: template.filterableTags,
        updatedAt: new Date(),
      },
      create: {
        id: template.id,
        name,
        description,
        overpassQuery: template.overpassQuery,
        category: { connect: { id: categoryId } },
        tags: template.tags,
        filterableTags: template.filterableTags,
      },
    });
    upserted++;

    // Upsert translations
    for (const locale of AVAILABLE_LOCALES) {
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

  // Pass 2: connect or clear parent relationships
  let parentsLinked = 0;
  for (const template of result.templates) {
    if (template.parent) {
      await prisma.template.update({
        where: { id: template.id },
        data: { parent: { connect: { id: template.parent } } },
      });
      parentsLinked++;
    } else {
      await prisma.template.update({
        where: { id: template.id },
        data: { parentId: null },
      });
    }
  }

  // Pass 3: replacement pointers, after the upserts so every new id has a row.
  // One transaction, so a redirect never sees the pointers half rewritten.
  const oldIds = Object.keys(result.replacedBy);
  const unmatchedOldIds = await prisma.$transaction(async (tx) => {
    await tx.template.updateMany({
      where: { replacedById: { not: null }, id: { notIn: oldIds } },
      data: { replacedById: null },
    });
    const unmatched: string[] = [];
    for (const [oldId, newId] of Object.entries(result.replacedBy)) {
      const { count } = await tx.template.updateMany({
        where: { id: oldId },
        data: { replacedById: newId },
      });
      if (count === 0) unmatched.push(oldId);
    }
    return unmatched;
  });
  // A typo, or a template already deleted after its grace period
  if (unmatchedOldIds.length > 0) {
    console.warn(`replacedBy: no template row for ${unmatchedOldIds.join(", ")}`);
  }

  console.log(`Upserted ${upserted} templates from YAML`);
  console.log(`Linked ${parentsLinked} parent relationships`);
  console.log(`Set ${oldIds.length - unmatchedOldIds.length} replacement pointers`);

  const { count: pruned } = await prisma.category.deleteMany({
    where: {
      slug: { notIn: result.categories.map((c) => c.slug) },
      templates: { none: {} },
    },
  });
  console.log(`Pruned ${pruned} undeclared categories with no templates`);
  console.log("Sync complete");
}

/**
 * Upsert the category tree and return slug -> id. Topics go first so a child's
 * parent id is known. `name` is only set on create: labels come from the
 * CategoryLabel messages, and rewriting legacy names could collide with the
 * unique index.
 */
async function syncCategories(
  categories: ParsedCategory[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const topicsFirst = [...categories].sort(
    (a, b) => Number(!!a.parent) - Number(!!b.parent),
  );
  for (const { slug, parent } of topicsFirst) {
    // parseTemplates guarantees a parent is a topic, so it is already in ids
    const parentId = parent ? ids.get(parent)! : null;
    const { id } = await prisma.category.upsert({
      where: { slug },
      update: { parentId },
      create: { slug, name: slug, parentId },
      select: { id: true },
    });
    ids.set(slug, id);
  }
  console.log(`Synced ${categories.length} categories`);
  return ids;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
