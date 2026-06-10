import { AGE_COLORS } from "./map-layers";
import type { MapTheme, BooleanTheme } from "@/lib/map-themes/types";
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
 * Get the boolean palette for a given theme based on its true/false value pattern.
 * Determines if it's yes/no, true/false, or 1/0 pattern.
 */
const getBooleanPalette = (theme: BooleanTheme) => {
  if (theme.trueValue === 'yes' && theme.falseValue === 'no') {
    return PALETTES.boolean.yesNo;
  }
  if (theme.trueValue === true && theme.falseValue === false) {
    return PALETTES.boolean.trueFalse;
  }
  if (theme.trueValue === 1 && theme.falseValue === 0) {
    return PALETTES.boolean.oneZero;
  }
  // Fallback to yes/no pattern for custom values
  return PALETTES.boolean.yesNo;
};

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
    // Boolean: use match expression for true/false/other
    // match takes: input, [match1, output1], [match2, output2], ..., fallback
    const matches: unknown[] = [];

    // Add main trueValue match
    matches.push(theme.trueValue, theme.trueColor);

    // Add all alias matches (excluding trueValue itself)
    for (const alias of theme.trueAliases) {
      if (alias !== theme.trueValue) {
        matches.push(alias, theme.trueColor);
      }
    }

    // Add false value match
    matches.push(theme.falseValue, theme.falseColor);

    // Get the appropriate palette for muted fallback
    const palette = getBooleanPalette(theme);

    // Build match expression with muted fallback
    return [
      "match",
      ["get", theme.field],
      ...matches,
      palette.muted, // fallback for unexpected values
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
): number | unknown[] => {
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
