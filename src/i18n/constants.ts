export const AVAILABLE_LOCALES = ["en", "pt-BR", "es", "fr"] as const;

export const LOCALE_DISPLAY_NAMES = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  fr: "Français",
} as const;

export type AvailableLocale = keyof typeof LOCALE_DISPLAY_NAMES;

export const DEFAULT_LOCALE = "en" as const;
