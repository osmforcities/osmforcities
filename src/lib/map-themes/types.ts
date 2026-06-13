// src/lib/map-themes/types.ts

/**
 * A categorical theme for properties with 2-30 distinct string values.
 * Example: amenity types (bench, fountain, atm, etc.)
 */
export interface CategoricalTheme {
  type: 'categorical';
  field: string;
  colorMap: Map<string, string>;
  topValues: Array<{ value: string; count: number }>;
  otherCount: number;
}

/**
 * An intensity theme for numeric properties with a range > 0.
 * Example: capacity=10-100, height=1-50
 */
export interface IntensityTheme {
  type: 'intensity';
  field: string;
  min: number;
  max: number;
  colorScale: [string, string];
}

/**
 * A map theme detected from dataset feature properties.
 * Age theme is NOT included — it's always available as a UI fallback.
 */
export type MapTheme = CategoricalTheme | IntensityTheme;

/**
 * A feature property with its analyzed values.
 */
export interface PropertyAnalysis {
  field: string;
  coverage: number; // 0-1
  values: Array<unknown>;
  nonNullCount: number;
  uniqueValues: Set<unknown>;
  type: 'string' | 'number' | 'boolean' | 'mixed';
  dominantType: 'string' | 'number' | 'boolean';
}

/**
 * Configuration for theme detection.
 */
export interface DetectionConfig {
  minCoverage: number; // Default: 0.3 (30%)
  maxCoercionFailureRate: number; // Default: 0.2 (20%)
  excludedProperties: Set<string>;
}
