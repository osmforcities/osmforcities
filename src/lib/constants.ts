export const GITHUB_REPO_URL = "https://github.com/osmforcities/osmforcities";

/** Maximum number of datasets a user can save */
export const MAX_SAVES_PER_USER = 10;

export const CONTACT_FORM_URL = "https://forms.gle/RGZdZ1mzo4hZx5g27";

/** Days before a deprecated template is deleted */
export const DEPRECATION_DAYS = 30;

/** Simplification tolerance for area boundaries (reduces coordinate count while preserving detail) */
export const BOUNDARY_SIMPLIFICATION_TOLERANCE = 0.00001;

/** Estimated size above which the app stores none of a dataset's features, in bytes (glossary: Cap) */
export const DATASET_CAP_BYTES = 25 * 1024 * 1024;

/** Empirical average JSON bytes per Overpass element, used to pre-estimate payload size from an element count */
export const OVERPASS_BYTES_PER_ELEMENT_ESTIMATE = 500;

/** Short, because a count probe timeout is usually transient Overpass load */
export const TIMEOUT_VERDICT_TTL_MINUTES = 30;

/**
 * Milliseconds the first count probe waits for Overpass. The wait page
 * switches to its large-area label at the same moment, when the retry starts.
 */
export const COUNT_REQUEST_TIMEOUT_MS = 30_000;

/** Consecutive failed refresh attempts before a dataset is flagged for admin review */
export const DATASET_FAILURE_FLAG_THRESHOLD = 3;

/** Initial zoom for the dataset map when centering on the area's admin centre */
export const DATASET_MAP_DEFAULT_ZOOM = 12;

/** Max lat-corrected bbox span (degrees, ~25 km) below which a bounds fit still gives a good initial view */
export const AREA_BOUNDS_MAX_SPAN_DEG = 0.25;

/** Days before stored area info (name, bounds, center, countryCode) is refreshed on view */
export const AREA_INFO_TTL_DAYS = 30;

/** Map app locale to YML file locale key (YML uses 'pt' not 'pt-BR') */
export const YML_LOCALE_MAP: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
};
