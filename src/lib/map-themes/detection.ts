// src/lib/map-themes/detection.ts

import type { Feature } from 'geojson';
import type { PropertyAnalysis, BooleanTheme, IntensityTheme, CategoricalTheme, MapTheme } from './types';
import { PALETTES } from './palettes';

/**
 * Properties to exclude from theme detection.
 * OSM metadata, internal fields, and common non-data fields.
 */
export const EXCLUDED_PROPERTIES = new Set([
  // OSM metadata — both @-prefixed (Overpass API) and bare (stored GeoJSON) forms
  '@id',
  '@type',
  '@version',
  '@changeset',
  '@timestamp',
  '@user',
  '@uid',
  'uid',
  'user',
  'changeset',
  'version',
  // Internal fields
  'ageCategory',
  'originalType',
  'featureId',
  // Common non-data fields
  'name',
  'id',
  'ref',
  'description',
  'timestamp',
]) as Set<string>;

/**
 * Check if a property should be excluded from theme detection.
 */
export function isPropertyExcluded(property: string): boolean {
  return EXCLUDED_PROPERTIES.has(property);
}

/**
 * Analyze a property across all features to determine coverage, type, and values.
 */
export function analyzeProperty(
  features: Feature[],
  field: string
): PropertyAnalysis {
  const values: unknown[] = [];
  const uniqueValues = new Set<unknown>();
  let nonNullCount = 0;
  const typeCounts: Record<string, number> = {};

  for (const feature of features) {
    const value = feature.properties?.[field];

    if (value !== null && value !== undefined) {
      nonNullCount++;
      values.push(value);
      uniqueValues.add(value);

      // For strings, check if they're actually numbers
      let detectedType = typeof value;
      if (detectedType === 'string') {
        const trimmed = (value as string).trim();
        if (trimmed !== '' && !isNaN(Number(trimmed))) {
          detectedType = 'number';
        }
      }

      typeCounts[detectedType] = (typeCounts[detectedType] || 0) + 1;
    }
  }

  const totalCount = features.length;
  const coverage = totalCount > 0 ? nonNullCount / totalCount : 0;

  // Determine dominant type
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const dominantType = (sortedTypes[0]?.[0] as 'string' | 'number' | 'boolean') || 'string';

  // Check if mixed
  const isMixed = Object.keys(typeCounts).length > 1;
  const detectedType = isMixed ? 'mixed' : dominantType;

  return {
    field,
    coverage,
    values,
    nonNullCount,
    uniqueValues,
    type: detectedType,
    dominantType,
  };
}

/**
 * Known boolean patterns in OSM data.
 */
const BOOLEAN_PATTERNS = [
  { true: 'yes', false: 'no', palette: PALETTES.boolean.blueOrange },
  { true: 'true', false: 'false', palette: PALETTES.boolean.trueFalse },
  { true: true, false: false, palette: PALETTES.boolean.trueFalse },
  { true: 1, false: 0, palette: PALETTES.boolean.oneZero },
] as const;

/**
 * Grouping patterns for OSM boolean fields where extra values should be mapped.
 * Format: field -> { groupedValue: [values to group] }
 */
const BOOLEAN_GROUPING: Record<string, Record<string, string[]>> = {
  covered: {
    yes: ['yes', 'roof'], // roof counts as covered
  },
  shelter: {
    yes: ['yes', 'covered'], // covered counts as sheltered
  },
};

/**
 * Detect if a property represents a boolean theme.
 * Returns null if the property doesn't match boolean patterns.
 */
export function detectBooleanTheme(
  analysis: PropertyAnalysis
): BooleanTheme | null {
  // Apply grouping rules if field-specific grouping exists
  const grouping = BOOLEAN_GROUPING[analysis.field];
  let effectiveValues = Array.from(analysis.uniqueValues);
  const trueAliases: Array<string | boolean | number> = [];

  if (grouping) {
    // Create a reverse mapping: value -> grouped value
    const valueToGrouped: Record<string, string> = {};
    for (const [groupedValue, sourceValues] of Object.entries(grouping)) {
      for (const sourceValue of sourceValues) {
        valueToGrouped[sourceValue] = groupedValue;
      }
    }

    // Group values that should be merged
    effectiveValues = effectiveValues.map((v) => {
      const strV = String(v);
      const grouped = valueToGrouped[strV];
      if (grouped && grouped === 'yes') {
        // Track values that were grouped into 'true'
        if (!trueAliases.includes(v as string | boolean | number)) {
          trueAliases.push(v as string | boolean | number);
        }
      }
      return grouped || strV;
    });

    // Remove duplicates after grouping
    effectiveValues = Array.from(new Set(effectiveValues));
  }

  // Must have exactly 2 distinct values after grouping
  if (effectiveValues.length !== 2) {
    return null;
  }

  for (const pattern of BOOLEAN_PATTERNS) {
    // Check both strict equality and string version for flexibility
    const hasTrue = effectiveValues.includes(pattern.true) || effectiveValues.includes(String(pattern.true));
    const hasFalse = effectiveValues.includes(pattern.false) || effectiveValues.includes(String(pattern.false));

    if (hasTrue && hasFalse) {
      return {
        type: 'boolean',
        field: analysis.field,
        trueColor: pattern.palette.true,
        falseColor: pattern.palette.false,
        trueValue: pattern.true,
        falseValue: pattern.false,
        trueAliases,
      };
    }
  }

  return null;
}

/**
 * Detect if a property represents an intensity (numeric range) theme.
 * Returns null if the property doesn't have a valid numeric range.
 */
export function detectIntensityTheme(
  analysis: PropertyAnalysis,
  maxCoercionFailureRate = 0.2
): IntensityTheme | null {
  // Allow numeric or string dominant (strings might be numeric)
  if (analysis.dominantType !== 'number' && analysis.dominantType !== 'string') {
    return null;
  }

  // Coerce all values to numbers, filter out failures
  const numericValues = analysis.values
    .map((v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const parsed = Number(v);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  // Check coercion failure rate
  const failureRate = 1 - numericValues.length / analysis.values.length;
  if (failureRate > maxCoercionFailureRate) {
    return null; // Too many values couldn't be coerced
  }

  if (numericValues.length === 0) {
    return null;
  }

  // Sort for percentile calculation
  const sorted = [...numericValues].sort((a, b) => a - b);

  // Use percentiles instead of raw min/max to handle outliers better
  // 10th percentile as lower bound, 90th as upper bound
  const p10Index = Math.floor(sorted.length * 0.1);
  const p90Index = Math.floor(sorted.length * 0.9);
  const min = sorted[p10Index];
  const max = sorted[p90Index];

  // Zero range means no meaningful intensity
  if (min === max || min === undefined || max === undefined) {
    return null;
  }

  return {
    type: 'intensity',
    field: analysis.field,
    min,
    max,
    colorScale: PALETTES.intensity.blue as [string, string],
  };
}

const MIN_CATEGORIES = 2;
const MAX_CATEGORIES = 30;

/**
 * Detect if a property represents a categorical theme.
 * Returns null if the property doesn't meet categorical criteria.
 */
export function detectCategoricalTheme(
  analysis: PropertyAnalysis
): CategoricalTheme | null {
  // Must be string dominant type
  if (analysis.dominantType !== 'string') {
    return null;
  }

  // Count values case-insensitively, tracking most common original casing
  const valueCounts = new Map<string, number>();
  const casingCounts = new Map<string, Map<string, number>>(); // lower -> Map<original, count>

  for (const value of analysis.values) {
    if (typeof value !== 'string') continue;

    const lower = value.toLowerCase();
    const count = valueCounts.get(lower) || 0;
    valueCounts.set(lower, count + 1);

    // Track each casing variant
    if (!casingCounts.has(lower)) {
      casingCounts.set(lower, new Map());
    }
    const casingMap = casingCounts.get(lower)!;
    casingMap.set(value, (casingMap.get(value) || 0) + 1);
  }

  // Determine most common casing for each lowercase value
  const originalValueByLower = new Map<string, string>();
  for (const [lower, casingMap] of casingCounts.entries()) {
    let bestCasing = lower;
    let bestCount = 0;
    for (const [casing, count] of casingMap.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestCasing = casing;
      }
    }
    originalValueByLower.set(lower, bestCasing);
  }

  const uniqueCount = valueCounts.size;

  // Must have 2-30 distinct values
  if (uniqueCount < MIN_CATEGORIES || uniqueCount > MAX_CATEGORIES) {
    return null;
  }

  // Sort by frequency
  const topValues = Array.from(valueCounts.entries())
    .map(([lower, count]) => ({
      value: originalValueByLower.get(lower) || lower,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, PALETTES.categorical.tableau10.length); // Top N get distinct colors (one per palette slot)

  // Assign colors from palette, keyed by original casing value
  const colorMap = new Map<string, string>();
  for (let i = 0; i < topValues.length; i++) {
    // Use the original casing value as the key (not lowercase)
    const originalValue = topValues[i].value;
    colorMap.set(
      originalValue,
      PALETTES.categorical.tableau10[i % PALETTES.categorical.tableau10.length]
    );
  }

  const otherCount = Math.max(0, uniqueCount - PALETTES.categorical.tableau10.length);

  return {
    type: 'categorical',
    field: analysis.field,
    colorMap,
    topValues,
    otherCount,
  };
}

/**
 * Calculate a theme's score for sorting.
 * Higher score = better default visualization.
 *
 * Boolean: coverage × 10 (binary distinctions are very clear)
 * Intensity: coverage × 5 (numeric scales are useful but harder to read)
 * Categorical: coverage × min(n, 10) (more categories = more useful, capped at 10)
 */
export function calculateScore(theme: MapTheme, coverage: number): number {
  switch (theme.type) {
    case 'boolean':
      return coverage * 10;
    case 'intensity':
      return coverage * 5;
    case 'categorical':
      const categoryCount = theme.topValues.length + theme.otherCount;
      return coverage * Math.min(categoryCount, 10);
    default:
      return 0;
  }
}
