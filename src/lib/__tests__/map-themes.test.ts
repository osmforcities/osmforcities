// src/lib/__tests__/map-themes.test.ts

import { describe, it, expect } from 'vitest';
import { isPropertyExcluded, analyzeProperty, detectBooleanTheme, detectIntensityTheme, detectCategoricalTheme, calculateScore } from '../map-themes/detection';
import type { Feature } from 'geojson';
import type { PropertyAnalysis, CategoricalTheme, BooleanTheme, IntensityTheme } from '../map-themes/types';

describe('isPropertyExcluded', () => {
  it('should exclude OSM metadata properties', () => {
    expect(isPropertyExcluded('@id')).toBe(true);
    expect(isPropertyExcluded('@type')).toBe(true);
    expect(isPropertyExcluded('@timestamp')).toBe(true);
  });

  it('should exclude internal fields', () => {
    expect(isPropertyExcluded('ageCategory')).toBe(true);
    expect(isPropertyExcluded('originalType')).toBe(true);
    expect(isPropertyExcluded('featureId')).toBe(true);
  });

  it('should exclude common non-data fields', () => {
    expect(isPropertyExcluded('name')).toBe(true);
    expect(isPropertyExcluded('id')).toBe(true);
    expect(isPropertyExcluded('ref')).toBe(true);
    expect(isPropertyExcluded('description')).toBe(true);
  });

  it('should not exclude data properties', () => {
    expect(isPropertyExcluded('amenity')).toBe(false);
    expect(isPropertyExcluded('capacity')).toBe(false);
    expect(isPropertyExcluded('covered')).toBe(false);
  });
});

describe('analyzeProperty', () => {
  const features = [
    { type: 'Feature', properties: { amenity: 'bench' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'bench' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'fountain' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'atm' }, geometry: null },
    { type: 'Feature', properties: { }, geometry: null }, // missing
  ] as unknown as Feature[];

  it('should calculate coverage correctly', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.coverage).toBe(0.8); // 4 out of 5
  });

  it('should extract unique values', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.uniqueValues.size).toBe(3);
    expect(Array.from(result.uniqueValues)).toEqual(expect.arrayContaining(['bench', 'fountain', 'atm']));
  });

  it('should detect string type', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.dominantType).toBe('string');
  });
});

describe('detectBooleanTheme', () => {
  it('should detect yes/no pattern', () => {
    const analysis: PropertyAnalysis = {
      field: 'covered',
      coverage: 1,
      values: ['yes', 'no', 'yes', 'no'],
      nonNullCount: 4,
      uniqueValues: new Set(['yes', 'no']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectBooleanTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('boolean');
    expect(theme?.field).toBe('covered');
    expect(theme?.trueValue).toBe('yes');
    expect(theme?.falseValue).toBe('no');
  });

  it('should detect true/false pattern', () => {
    const analysis: PropertyAnalysis = {
      field: 'lit',
      coverage: 1,
      values: [true, false, true],
      nonNullCount: 3,
      uniqueValues: new Set([true, false]),
      type: 'boolean',
      dominantType: 'boolean',
    };
    const theme = detectBooleanTheme(analysis);
    expect(theme?.trueValue).toBe(true);
    expect(theme?.falseValue).toBe(false);
  });

  it('should detect 1/0 pattern', () => {
    const analysis: PropertyAnalysis = {
      field: 'accessible',
      coverage: 1,
      values: [1, 0, 1, 1],
      nonNullCount: 4,
      uniqueValues: new Set([1, 0]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectBooleanTheme(analysis);
    expect(theme?.trueValue).toBe(1);
    expect(theme?.falseValue).toBe(0);
  });

  it('should reject non-boolean values', () => {
    const analysis: PropertyAnalysis = {
      field: 'amenity',
      coverage: 1,
      values: ['bench', 'fountain'],
      nonNullCount: 2,
      uniqueValues: new Set(['bench', 'fountain']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectBooleanTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject if not exactly 2 values', () => {
    const analysis: PropertyAnalysis = {
      field: 'capacity',
      coverage: 1,
      values: [1, 2, 3],
      nonNullCount: 3,
      uniqueValues: new Set([1, 2, 3]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectBooleanTheme(analysis);
    expect(theme).toBeNull();
  });
});

describe('detectIntensityTheme', () => {
  it('should detect numeric range', () => {
    const analysis: PropertyAnalysis = {
      field: 'capacity',
      coverage: 1,
      values: [10, 20, 50, 100],
      nonNullCount: 4,
      uniqueValues: new Set([10, 20, 50, 100]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('intensity');
    expect(theme?.min).toBe(10);
    expect(theme?.max).toBe(100);
  });

  it('should reject zero range', () => {
    const analysis: PropertyAnalysis = {
      field: 'level',
      coverage: 1,
      values: [0, 0, 0],
      nonNullCount: 3,
      uniqueValues: new Set([0]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject non-numeric dominant type', () => {
    const analysis: PropertyAnalysis = {
      field: 'name',
      coverage: 1,
      values: ['a', 'b'],
      nonNullCount: 2,
      uniqueValues: new Set(['a', 'b']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should coerce string numbers to numeric', () => {
    const analysis: PropertyAnalysis = {
      field: 'height',
      coverage: 1,
      values: ['10', '20', '30', 40], // mixed types
      nonNullCount: 4,
      uniqueValues: new Set(['10', '20', '30', 40]),
      type: 'mixed',
      dominantType: 'number', // assume more numeric values
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.min).toBe(10);
    expect(theme?.max).toBe(40);
  });

  it('should treat empty strings as coercion failures, not as 0', () => {
    // 5 numerics + 1 empty → failure rate 1/6 ≈ 0.17 < default 0.2 threshold
    const analysis: PropertyAnalysis = {
      field: 'height',
      coverage: 1,
      values: [10, 20, 30, 40, 50, ''],
      nonNullCount: 6,
      uniqueValues: new Set([10, 20, 30, 40, 50, '']),
      type: 'mixed',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.min).toBe(10); // not 0
    expect(theme?.max).toBe(50);
  });
});

describe('detectCategoricalTheme', () => {
  it('should detect categorical values', () => {
    const analysis: PropertyAnalysis = {
      field: 'amenity',
      coverage: 1,
      values: ['bench', 'bench', 'fountain', 'atm', 'atm', 'atm'],
      nonNullCount: 6,
      uniqueValues: new Set(['bench', 'fountain', 'atm']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('categorical');
    expect(theme?.field).toBe('amenity');
    expect(theme?.topValues).toHaveLength(3);
    expect(theme?.topValues[0].value).toBe('atm'); // most frequent
  });

  it('should reject single value (constant)', () => {
    const analysis: PropertyAnalysis = {
      field: 'type',
      coverage: 1,
      values: ['node', 'node', 'node'],
      nonNullCount: 3,
      uniqueValues: new Set(['node']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject too many categories (>30)', () => {
    const values = Array.from({ length: 35 }, (_, i) => `type-${i}`);
    const analysis: PropertyAnalysis = {
      field: 'ref',
      coverage: 1,
      values,
      nonNullCount: 35,
      uniqueValues: new Set(values),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject non-string dominant type', () => {
    const analysis: PropertyAnalysis = {
      field: 'capacity',
      coverage: 1,
      values: [10, 20, 30],
      nonNullCount: 3,
      uniqueValues: new Set([10, 20, 30]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should merge case-insensitively', () => {
    const analysis: PropertyAnalysis = {
      field: 'material',
      coverage: 1,
      values: ['Wood', 'wood', 'WOOD', 'Metal'],
      nonNullCount: 4,
      uniqueValues: new Set(['Wood', 'wood', 'WOOD', 'Metal']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeDefined();
    // Should have 2 categories: wood (merged) and metal
    expect(theme?.topValues.length).toBeLessThanOrEqual(2);
  });
});

describe('calculateScore', () => {
  it('should score boolean with coverage multiplier', () => {
    const theme: BooleanTheme = {
      type: 'boolean',
      field: 'covered',
      trueColor: '#22c55e',
      falseColor: '#ef4444',
      trueValue: 'yes',
      falseValue: 'no',
    };
    const coverage = 0.8; // 80%
    const score = calculateScore(theme, coverage);
    expect(score).toBe(8); // 0.8 * 10 = 8
  });

  it('should score intensity with coverage multiplier', () => {
    const theme: IntensityTheme = {
      type: 'intensity',
      field: 'capacity',
      min: 10,
      max: 100,
      colorScale: ['#deebf7', '#08519c'],
    };
    const coverage = 0.8;
    const score = calculateScore(theme, coverage);
    expect(score).toBe(4); // 0.8 * 5 = 4
  });

  it('should score categorical with coverage and category count', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map(),
      topValues: [
        { value: 'bench', count: 10 },
        { value: 'fountain', count: 5 },
        { value: 'atm', count: 3 },
      ],
      otherCount: 0,
    };
    const coverage = 0.8; // 80%
    const score = calculateScore(theme, coverage);
    expect(score).toBeCloseTo(2.4); // 0.8 * 3 = 2.4 (min(3, 10) = 3)
  });

  it('should cap categorical category count at 10', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map(),
      topValues: Array.from({ length: 20 }, (_, i) => ({ value: `type-${i}`, count: 1 })),
      otherCount: 0,
    };
    const coverage = 1.0;
    const score = calculateScore(theme, coverage);
    expect(score).toBe(10); // 1.0 * min(20, 10) = 10
  });
});
