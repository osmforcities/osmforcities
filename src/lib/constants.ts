export const GITHUB_REPO_URL = "https://github.com/osmforcities/osmforcities";

/** Maximum number of datasets a user can save */
export const MAX_SAVES_PER_USER = 10;

export const CONTACT_FORM_URL = "https://forms.gle/RGZdZ1mzo4hZx5g27";

/** Days before a deprecated template is deleted */
export const DEPRECATION_DAYS = 30;

/** Simplification tolerance for area boundaries (reduces coordinate count while preserving detail) */
export const BOUNDARY_SIMPLIFICATION_TOLERANCE = 0.00001;

/** Initial zoom for the dataset map when centering on the area's admin centre */
export const DATASET_MAP_DEFAULT_ZOOM = 12;

/** Max lat-corrected bbox span (degrees, ~25 km) below which a bounds fit still gives a good initial view */
export const AREA_BOUNDS_MAX_SPAN_DEG = 0.25;

/** Supported locales for translations */
export const SUPPORTED_LOCALES = ["en", "pt-BR", "es"] as const;

/** Map app locale to YML file locale key (YML uses 'pt' not 'pt-BR') */
export const YML_LOCALE_MAP: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
};
