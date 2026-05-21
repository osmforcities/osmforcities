/**
 * Resolve template name/description by locale from DB translations.
 * App locales: en, pt-BR, es. DB locales: en, pt-BR, es.
 */

export function mapAppLocaleToDb(appLocale: string): string {
  // All locales use their own locale directly
  return appLocale;
}

export type TemplateWithTranslations = {
  translations: Array<{
    locale: string;
    name: string;
    description: string | null;
  }>;
} & Record<string, unknown>;

/**
 * Resolve name and description for a template for the given app locale.
 * Returns template with name/description overridden from translation when available.
 */
export function resolveTemplateForLocale<T extends TemplateWithTranslations & { name: string; description: string | null }>(
  template: T,
  appLocale: string,
): Omit<T, "translations"> {
  const dbLocale = mapAppLocaleToDb(appLocale);
  const translation = template.translations?.find((t) => t.locale === dbLocale);
  const name = translation?.name ?? template.name;
  const description = translation?.description ?? template.description;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { translations: _, ...rest } = template;
  return { ...rest, name, description: description ?? null } as Omit<T, "translations">;
}
