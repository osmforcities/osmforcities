// The tiler's default bands, in the order of the stored count arrays. `labelKey` is the DatasetPage i18n key.
export const RECENCY_BANDS = [
  { key: "upTo90d", labelKey: "band90d" },
  { key: "d90dTo1y", labelKey: "band90dTo1y" },
  { key: "d1yTo2y", labelKey: "band1yTo2y" },
  { key: "over2y", labelKey: "band2yPlus" },
] as const;
