// src/lib/map-themes/index.ts

import type { Feature } from 'geojson';
import type { MapTheme, DetectionConfig } from './types';
import {
  isPropertyExcluded,
  analyzeProperty,
  detectBooleanTheme,
  detectIntensityTheme,
  detectCategoricalTheme,
  calculateScore,
} from './detection';

const DEFAULT_CONFIG: DetectionConfig = {
  minCoverage: 0.3,
  maxCoercionFailureRate: 0.2,
  excludedProperties: new Set(),
};

/**
 * Detect all valid map themes from dataset feature properties.
 *
 * Scans all feature properties and returns themes that pass detection thresholds,
 * sorted by score (best first). A single dataset may have multiple valid themes.
 *
 * @param features - GeoJSON features to analyze
 * @param config - Optional detection configuration
 * @returns Array of valid themes, sorted by score descending
 */
export function detectMapThemes(
  features: Feature[] = [],
  config: Partial<DetectionConfig> = {}
): MapTheme[] {
  if (!features || features.length === 0) {
    return [];
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Collect all unique property names
  const allProperties = new Set<string>();
  for (const feature of features) {
    if (feature.properties) {
      for (const prop of Object.keys(feature.properties)) {
        allProperties.add(prop);
      }
    }
  }

  const themes: Array<{ theme: MapTheme; score: number }> = [];

  // Analyze each property
  for (const field of allProperties) {
    // Skip excluded properties
    if (isPropertyExcluded(field)) {
      continue;
    }

    const analysis = analyzeProperty(features, field);

    // Check coverage threshold
    if (analysis.coverage < finalConfig.minCoverage) {
      continue;
    }

    // Try each theme type
    const booleanTheme = detectBooleanTheme(analysis);
    if (booleanTheme) {
      themes.push({
        theme: booleanTheme,
        score: calculateScore(booleanTheme, analysis.coverage),
      });
      continue; // Boolean is exclusive
    }

    const intensityTheme = detectIntensityTheme(analysis);
    if (intensityTheme) {
      themes.push({
        theme: intensityTheme,
        score: calculateScore(intensityTheme, analysis.coverage),
      });
      continue; // Intensity is exclusive
    }

    const categoricalTheme = detectCategoricalTheme(analysis);
    if (categoricalTheme) {
      themes.push({
        theme: categoricalTheme,
        score: calculateScore(categoricalTheme, analysis.coverage),
      });
    }
  }

  // Sort by score descending
  themes.sort((a, b) => b.score - a.score);

  return themes.map((t) => t.theme);
}

// Re-export types for convenience
export * from './types';
export { PALETTES } from './palettes';
export {
  isPropertyExcluded,
  analyzeProperty,
  detectBooleanTheme,
  detectIntensityTheme,
  detectCategoricalTheme,
  calculateScore,
} from './detection';
