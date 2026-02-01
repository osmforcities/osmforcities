export const GITHUB_REPO_URL = "https://github.com/osmforcities/osmforcities";

export const CONTACT_FORM_URL = "https://forms.gle/RGZdZ1mzo4hZx5g27";

/** Days before a deprecated template is deleted */
export const DEPRECATION_DAYS = 30;

/** Supported locales for translations */
export const SUPPORTED_LOCALES = ["en", "pt-BR", "es"] as const;

/** Map app locale to YML file locale key (YML uses 'pt' not 'pt-BR') */
export const YML_LOCALE_MAP: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
};
