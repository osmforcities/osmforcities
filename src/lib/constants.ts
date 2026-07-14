export const GITHUB_REPO_URL = "https://github.com/osmforcities/osmforcities";

/** Maximum number of datasets a user can save */
export const MAX_SAVES_PER_USER = 10;

export const CONTACT_FORM_URL = "https://forms.gle/RGZdZ1mzo4hZx5g27";

/** Days before a deprecated template is deleted */
export const DEPRECATION_DAYS = 30;

/** Simplification tolerance for area boundaries (reduces coordinate count while preserving detail) */
export const BOUNDARY_SIMPLIFICATION_TOLERANCE = 0.00001;

/** Maximum Overpass response size for a dataset, in bytes */
export const MAX_DATASET_BYTES = 10 * 1024 * 1024;

/** Empirical average JSON bytes per Overpass element, used to pre-estimate payload size from an element count */
export const OVERPASS_BYTES_PER_ELEMENT_ESTIMATE = 400;

/** Hours an AreaSizeCheck verdict stays fresh before re-checking against Overpass */
export const SIZE_CHECK_TTL_HOURS = 24;

/** Supported locales for translations */
export const SUPPORTED_LOCALES = ["en", "pt-BR", "es"] as const;

/** Map app locale to YML file locale key (YML uses 'pt' not 'pt-BR') */
export const YML_LOCALE_MAP: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
};
