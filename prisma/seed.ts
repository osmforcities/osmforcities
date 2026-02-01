import { PrismaClient } from "@prisma/client";
import {
  loadTemplatesI18n,
  loadTemplatesYaml,
  parseTemplates,
} from "./lib/template-parser";

const prisma = new PrismaClient();

const SUPPORTED_LOCALES = ["en", "pt-BR", "es"] as const;

// Map app locale to YML file locale key (YML uses 'pt' not 'pt-BR')
const YML_LOCALE_MAP: Record<string, string> = {
  "pt-BR": "pt",
  "en": "en",
  "es": "es",
};

/**
 * Seed templates and template translations to database.
 *
 * Loads logic from templates.yml, translations from templates.i18n.yml,
 * validates, and upserts Template plus TemplateTranslation (en, pt).
 */
async function main() {
  console.log("Start seeding...");

  let logicConfig: ReturnType<typeof loadTemplatesYaml>;
  try {
    logicConfig = loadTemplatesYaml();
  } catch (error) {
    console.error("Failed to load templates.yml:", error);
    process.exit(1);
  }

  let i18nConfig: ReturnType<typeof loadTemplatesI18n> | null = null;
  try {
    i18nConfig = loadTemplatesI18n();
  } catch {
    console.warn(
      "templates.i18n.yml not found or invalid; seeding with fallback names only.",
    );
  }

  const result = parseTemplates(logicConfig);

  if (result.errors.length > 0) {
    console.error("Validation errors:");
    for (const err of result.errors) {
      console.error(
        `  [${err.field}] ${err.message}${err.index !== undefined ? ` (template ${err.index})` : ""}`,
      );
    }
    console.error("Seeding aborted due to validation errors.");
    process.exit(1);
  }

  const templates = result.templates;
  const batchSize = 100;

  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const batchIds = batch.map((t) => t.id);

    const templateRows = batch.map((t) => {
      const i18n = i18nConfig?.templates?.[t.id];
      const name = i18n?.name?.en ?? t.name;
      const description = i18n?.desc?.en ?? t.description ?? null;
      return {
        id: t.id,
        name,
        description,
        overpassQuery: t.overpassQuery,
        category: t.category,
        tags: t.tags,
      };
    });

    const translationRows: {
      templateId: string;
      locale: string;
      name: string;
      description: string | null;
    }[] = [];
    for (const t of batch) {
      const i18n = i18nConfig?.templates?.[t.id];
      for (const locale of SUPPORTED_LOCALES) {
        const ymlLocale = YML_LOCALE_MAP[locale] ?? locale;
        const name =
          i18n?.name?.[ymlLocale] ?? (locale === "en" ? t.name : t.name);
        const desc =
          i18n?.desc?.[ymlLocale] ??
          (locale === "en" ? (t.description ?? null) : (t.description ?? null));
        translationRows.push({
          templateId: t.id,
          locale,
          name,
          description: desc ?? null,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.template.deleteMany({ where: { id: { in: batchIds } } });
      await tx.template.createMany({ data: templateRows });
      await tx.templateTranslation.createMany({ data: translationRows });
    });

    console.log(
      `Seeded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)} (${batch.length} templates)`,
    );
  }

  console.log("Seeded templates:", templates.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
