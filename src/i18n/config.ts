export const locales = ["en", "pt-BR"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeConfig = {
  locales,
  defaultLocale,
  // Don't add locale prefix for default locale
  localePrefix: "as-needed" as const,
} as const;
