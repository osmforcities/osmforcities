// src/lib/map-themes/detection.ts

import type { Feature } from 'geojson';
import type { PropertyAnalysis, BooleanTheme, IntensityTheme, CategoricalTheme, MapTheme } from './types';
import { PALETTES } from './palettes';

/**
 * Properties to exclude from theme detection.
 * OSM metadata, internal fields, and common non-data fields.
 */
export const EXCLUDED_PROPERTIES = new Set([
  // OSM metadata
  '@id',
  '@type',
  '@version',
  '@changeset',
  '@timestamp',
  '@user',
  '@uid',
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

      const type = typeof value;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
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
  { true: 'yes', false: 'no', palette: PALETTES.boolean.yesNo },
  { true: 'true', false: 'false', palette: PALETTES.boolean.trueFalse },
  { true: true, false: false, palette: PALETTES.boolean.trueFalse },
  { true: 1, false: 0, palette: PALETTES.boolean.oneZero },
] as const;

/**
 * Detect if a property represents a boolean theme.
 * Returns null if the property doesn't match boolean patterns.
 */
export function detectBooleanTheme(
  analysis: PropertyAnalysis
): BooleanTheme | null {
  // Must have exactly 2 distinct values
  if (analysis.uniqueValues.size !== 2) {
    return null;
  }

  const values = Array.from(analysis.uniqueValues);

  for (const pattern of BOOLEAN_PATTERNS) {
    const hasTrue = values.includes(pattern.true);
    const hasFalse = values.includes(pattern.false);

    if (hasTrue && hasFalse) {
      return {
        type: 'boolean',
        field: analysis.field,
        trueColor: pattern.palette.true,
        falseColor: pattern.palette.false,
        trueValue: pattern.true,
        falseValue: pattern.false,
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
  // Must have numeric or mixed type with numeric dominant
  if (analysis.dominantType !== 'number') {
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

  const min = numericValues.reduce((a, b) => (b < a ? b : a), numericValues[0]);
  const max = numericValues.reduce((a, b) => (b > a ? b : a), numericValues[0]);

  // Zero range means no meaningful intensity
  if (min === max) {
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

  // Assign colors from palette
  const colorMap = new Map<string, string>();
  for (let i = 0; i < topValues.length; i++) {
    colorMap.set(
      topValues[i].value,
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
