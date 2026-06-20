/**
 * Centralized analytics event name constants.
 * All Umami events must be defined here.
 */

export const ANALYTICS_EVENTS = {
  // Dataset events
  DATASET_CREATE: "dataset_create",
  DATASET_DETAIL_VIEW: "dataset_detail_view",
  DATASET_DOWNLOAD: "dataset_download",
  DATASET_SAVE: "dataset_save",
  DATASET_UNSAVE: "dataset_unsave",
  DATASET_REFRESH: "dataset_refresh",
  DATASET_REFRESH_JOB: "dataset_refresh_job",
  DATASET_UPSELL_VIEW: "dataset_upsell_view",

  // User events
  SIGN_UP: "sign_up",
  SAVED_DATASETS_VIEW: "saved_datasets_view",

  // Area events
  AREA_VIEW_LOGGED_IN: "area_view_logged_in",
  AREA_VIEW_LOGGED_OUT: "area_view_logged_out",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
