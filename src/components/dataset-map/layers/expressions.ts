import { AGE_COLORS } from "./map-layers";

export const createAgeColorExpression = (colors: typeof AGE_COLORS) =>
  [
    "case",
    ["==", ["get", "ageCategory"], "recent"],
    colors.recent,
    ["==", ["get", "ageCategory"], "medium"],
    colors.medium,
    ["==", ["get", "ageCategory"], "older"],
    colors.older,
    colors["very-old"],
  ] as const;

export const createSimplifiedOpacityExpression = (visibleOpacity: number) =>
  ["step", ["zoom"], visibleOpacity, 14, 0] as const;

export const createDetailedOpacityExpression = (originalOpacity: number) =>
  ["step", ["zoom"], 0, 14, originalOpacity] as const;
