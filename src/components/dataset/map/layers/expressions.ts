import { AGE_COLORS } from "./map-layers";
import type { MapTheme } from "@/lib/map-themes/types";
import { PALETTES } from "@/lib/map-themes/palettes";

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

/**
 * Build a MapLibre circle-color expression from a detected theme.
 * Handles categorical (case), boolean (case), and intensity (interpolate).
 */
export const buildCircleColorExpression = (theme: MapTheme) => {
  if (theme.type === "categorical") {
    // Build case expression with colorMap entries
    const entries = Array.from(theme.colorMap.entries());
    const expression: unknown[] = ["case"];

    for (const [value, color] of entries) {
      expression.push(["==", ["get", theme.field], value], color);
    }

    // Fallback color for "other" values
    expression.push(PALETTES.categorical.other);
    return expression;
  }

  if (theme.type === "boolean") {
    // Boolean: case with trueValue → trueColor, else → falseColor
    return [
      "case",
      ["==", ["get", theme.field], theme.trueValue],
      theme.trueColor,
      theme.falseColor,
    ] as const;
  }

  if (theme.type === "intensity") {
    // Intensity: interpolate with min/max and colorScale endpoints
    // Use to-number to handle string numeric values from OSM
    return [
      "interpolate",
      ["linear"],
      ["to-number", ["get", theme.field]],
      theme.min,
      theme.colorScale[0],
      theme.max,
      theme.colorScale[1],
    ] as const;
  }

  // Should never happen (exhaustive check)
  throw new Error(`Unknown theme type: ${(theme as { type: string }).type}`);
};

/**
 * Build a MapLibre circle-radius expression from a detected theme.
 * Returns an interpolate expression for intensity themes, or a fixed number for others.
 */
export const buildCircleRadiusExpression = (
  theme: MapTheme,
  baseRadius: number,
): number | unknown => {
  if (theme.type === "intensity") {
    // Intensity: interpolate radius from 0.5x to 1.5x baseRadius
    // Use to-number to handle string numeric values from OSM
    return [
      "interpolate",
      ["linear"],
      ["to-number", ["get", theme.field]],
      theme.min,
      baseRadius * 0.5,
      theme.max,
      baseRadius * 1.5,
    ] as const;
  }

  // Categorical and boolean: fixed radius
  return baseRadius;
};
