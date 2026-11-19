type LocaleEntry = {
  displayName: string;
  ymlKey: string;
  osmNameKeys: readonly string[];
};

export const LOCALES = {
  en: { displayName: "English", ymlKey: "en", osmNameKeys: ["en"] },
  "pt-BR": {
    displayName: "Português (Brasil)",
    ymlKey: "pt",
    // OSM tags Portuguese as name:pt, rarely name:pt-BR
    osmNameKeys: ["pt-BR", "pt"],
  },
  es: { displayName: "Español", ymlKey: "es", osmNameKeys: ["es"] },
  fr: { displayName: "Français", ymlKey: "fr", osmNameKeys: ["fr"] },
  de: { displayName: "Deutsch", ymlKey: "de", osmNameKeys: ["de"] },
} as const satisfies Record<string, LocaleEntry>;

export type AvailableLocale = keyof typeof LOCALES;

export const AVAILABLE_LOCALES = Object.keys(LOCALES) as AvailableLocale[];

export const LOCALE_DISPLAY_NAMES = Object.fromEntries(
  AVAILABLE_LOCALES.map((locale) => [locale, LOCALES[locale].displayName])
) as Record<AvailableLocale, string>;

export const YML_LOCALE_MAP = Object.fromEntries(
  AVAILABLE_LOCALES.map((locale) => [locale, LOCALES[locale].ymlKey])
) as Record<AvailableLocale, string>;

export const DEFAULT_LOCALE = "en" as const;
